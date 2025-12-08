
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();


const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    family: 4 
  });
};


export const sendMaintenanceReminder = async (maintenance, manager, daysUntil) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return;
  }

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

  const mailOptions = {
    from: `"SIMET - Sistema de Inventario" <${process.env.EMAIL_USER}>`,
    to: manager.correo,
    subject: subject,
    html: `
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
          Este es un correo automático generado por SIMET.
        </p>
      </div>
    `,
  };

  try {
    const transporter = createTransporter();
    await transporter.verify(); 
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Error al enviar correo de RECORDATORIO a ${manager.correo}:`, error.code || error.message);
  }
};