import nodemailer from "nodemailer";

// 1. Configurar el "Transportador" (quién envía el correo)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Plantilla de correo para RECORDATORIO de Mantenimiento.
 * @param {object} maintenance - El objeto de mantenimiento (con device, usuario, depto, etc. incluidos)
 * @param {object} manager - El jefe de área (User) que recibirá el correo.
 * @param {number} daysUntil - Cuántos días faltan (ej. 5 o 1)
 */
export const sendMaintenanceReminder = async (maintenance, manager, daysUntil) => {
  const device = maintenance.device || {};
  const user = device.usuario || {};
  const department = device.departamento || {};
  const deviceType = device.tipo || {};

  const subject = daysUntil === 1
    ? `Recordatorio de Mantenimiento (Mañana) - ${device.etiqueta || 'N/A'}`
    : `Recordatorio de Mantenimiento (${daysUntil} días) - ${device.etiqueta || 'N/A'}`;
  
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
        <p>Este es un recordatorio automático de que la siguiente tarea de mantenimiento está programada para tu departamento (<strong>${department.nombre || 'N/A'}</strong>).</p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        
        <h3 style="color: #555;">Detalles del Mantenimiento:</h3>
        <ul style="list-style-type: none; padding-left: 0;">
          <li><strong>Tarea:</strong> ${maintenance.descripcion}</li>
          <li><strong>Fecha Programada:</strong> ${new Date(maintenance.fecha_programada).toLocaleDateString('es-MX', { dateStyle: 'long' })}</li>
        </ul>

        <h3 style="color: #555;">Detalles del Equipo:</h3>
        <ul style="list-style-type: none; padding-left: 0;">
          <li><strong>Etiqueta:</strong> ${device.etiqueta || 'N/A'}</li>
          <li><strong>Tipo:</strong> ${deviceType.nombre || 'N/A'}</li>
          <li><strong>Usuario Asignado:</strong> ${user.nombre || 'No asignado'}</li>
        </ul>
        
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 0.9em; color: #777;">
          Este es un correo automático generado por SIMET.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Correo de RECORDATORIO (${daysUntil} días) enviado a: ${manager.correo}`);
  } catch (error) {
    console.error(`Error al enviar correo de RECORDATORIO a ${manager.correo}:`, error);
  }
};