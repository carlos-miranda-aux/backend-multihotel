import dotenv from "dotenv";
import { ConfidentialClientApplication } from "@azure/msal-node";

dotenv.config();

/**
 * Configuración de MSAL para obtener el token de acceso de Microsoft 365.
 * Este objeto utiliza las credenciales de tu aplicación registradas en Azure.
 */
const msalConfig = {
  auth: {
    clientId: process.env.EMAIL_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.EMAIL_TENANT_ID}`,
    clientSecret: process.env.EMAIL_CLIENT_SECRET,
  },
};

const pca = new ConfidentialClientApplication(msalConfig);

/**
 * Obtiene un token de acceso válido para Microsoft Graph.
 * Utiliza el flujo de 'Client Credentials' para aplicaciones backend.
 */
const getAccessToken = async () => {
  const tokenRequest = {
    // El scope /.default es obligatorio para el flujo de credenciales de aplicación
    scopes: ["https://graph.microsoft.com/.default"], 
  };

  try {
    const response = await pca.acquireTokenByClientCredential(tokenRequest);
    return response.accessToken;
  } catch (error) {
    console.error("Error al obtener token de acceso de Azure:", error.message);
    throw error;
  }
};

/**
 * Envía el recordatorio de mantenimiento utilizando la API REST de Microsoft Graph.
 * Esta función reemplaza la necesidad de configurar un transportador SMTP.
 */
export const sendMaintenanceReminder = async (maintenance, manager, daysUntil) => {
  // Verificación de variables críticas en el entorno
  if (!process.env.EMAIL_USER || !process.env.EMAIL_CLIENT_ID || !process.env.EMAIL_CLIENT_SECRET) {
    console.warn("DEBUG: No se enviará el correo porque faltan variables en el .env");
    return;
  }

  try {
    const accessToken = await getAccessToken();
    
    // Extracción de datos para el cuerpo del correo
    const device = maintenance.device || {};
    const user = device.usuario || {};
    const area = device.area || {}; 
    const deviceType = device.tipo || {};

    const subject = daysUntil === 1
      ? `Recordatorio de Mantenimiento (Mañana) - ${device.etiqueta || device.nombre_equipo || 'N/A'}`
      : `Recordatorio de Mantenimiento (${daysUntil} días) - ${device.etiqueta || device.nombre_equipo || 'N/A'}`;
    
    const title = daysUntil === 1
      ? `Recordatorio de Mantenimiento (Mañana)`
      : `Recordatorio de Mantenimiento (${daysUntil} días)`;

    // Construcción del objeto de mensaje según el esquema de Microsoft Graph
    const emailData = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #9D3194;">${title}</h2>
              <p>Hola, <strong>${manager.nombre}</strong>,</p>
              <p>Este es un recordatorio automático de que la siguiente tarea de mantenimiento está programada para tu área (<strong>${area.nombre || 'N/A'}</strong>).</p>
              <hr style="border: 0; border-top: 1px solid #eee;">
              
              <h3 style="color: #555;">Detalles del Mantenimiento:</h3>
              <ul style="list-style-type: none; padding-left: 0;">
                <li><strong>Tarea:</strong> ${maintenance.descripcion}</li>
                <li><strong>Fecha Programada:</strong> ${new Date(maintenance.fecha_programada).toLocaleDateString('es-MX', { dateStyle: 'long' })}</li>
              </ul>

              <h3 style="color: #555;">Detalles del Equipo:</h3>
              <ul style="list-style-type: none; padding-left: 0;">
                <li><strong>Nombre del Equipo:</strong> ${device.nombre_equipo || 'N/A'}</li>
                <li><strong>Usuario Asignado:</strong> ${user.nombre || 'No asignado'}</li>
                <li><strong>Tipo:</strong> ${deviceType.nombre || 'N/A'}</li>
                <li><strong>N° Serie:</strong> ${device.numero_serie || 'N/A'}</li>
                <li><strong>Modelo:</strong> ${device.modelo || 'N/A'}</li>
              </ul>
              
              <hr style="border: 0; border-top: 1px solid #eee;">
              <p style="font-size: 0.9em; color: #777;">
                Este es un correo automático generado por el sistema de inventario SIMET.
              </p>
            </div>
          `,
        },
        toRecipients: [
          {
            emailAddress: {
              address: manager.correo,
            },
          },
        ],
      },
      saveToSentItems: "true"
    };

    // Petición HTTP POST a la API de Microsoft Graph
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${process.env.EMAIL_USER}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      }
    );

    if (response.ok) {
      console.log(`Correo de recordatorio enviado exitosamente vía API a ${manager.correo}`);
    } else {
      const errorData = await response.json();
      console.error("Error al enviar correo (API Graph):", JSON.stringify(errorData, null, 2));
    }
  } catch (error) {
    console.error(`Error crítico en el servicio de correo para ${manager.correo}:`, error.message);
  }
};