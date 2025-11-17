import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./PrismaClient.js";
import bcrypt from "bcryptjs";
import cron from "node-cron"; // 👈 AÑADIR IMPORT DE CRON
import { sendMaintenanceReminder } from "./utils/email.service.js"; // 👈 AÑADIR IMPORT DEL EMAILER

// Importar rutas
import departmentRoutes from "./routes/department.routes.js";
import osRoutes from "./routes/operatingSystem.routes.js";
import deviceTypeRoutes from "./routes/deviceType.routes.js";
import deviceStatusRoutes from "./routes/deviceStatus.routes.js";
import userRoutes from "./routes/user.routes.js";
import devicesRoutes from "./routes/devices.routes.js";
import maintenanceRoutes from "./routes/maintenance.routes.js";
import disposalRoutes from "./routes/disposal.routes.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// rutas
app.use("/api/departments", departmentRoutes);
app.use("/api/operating-systems", osRoutes);
app.use("/api/device-types", deviceTypeRoutes);
app.use("/api/device-status", deviceStatusRoutes);
app.use("/api/users", userRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/maintenances", maintenanceRoutes);
app.use("/api/disposals", disposalRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);

  try {
    await prisma.$connect();
    console.log("Conectado a la BD");

    // ... (Lógica del superusuario existente) ...
    const superAdmin = await prisma.userSistema.findFirst({
      where: { username: "superadmin", rol: "ADMIN" }
    });

    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash("superadmin123", 10);
      const user = await prisma.userSistema.create({
        data: {
          username: "superadmin",
          email: "superadmin@crownparadise.com",
          password: hashedPassword,
          nombre: "Super Administrador",
          rol: "ADMIN",
        },
      });
      console.log("Superusuario creado:", user.username);
    } else {
      console.log("Superusuario ya existe:", superAdmin.username);
    }
  } catch (err) {
    console.error("Error al conectar a la DB o crear superusuario:", err);
  }

  // 👇 --- INICIO DE CÓDIGO NUEVO (TAREA PROGRAMADA) --- 👇

  // '0 7 * * *' = "Ejecutar todos los días a las 7:00 AM"
  console.log("Tarea programada de recordatorios configurada para ejecutarse a las 7:00 AM.");
  
  cron.schedule('0 7 * * *', async () => {
  //cron.schedule('* * * * *', async () => {  // PARA PRUEBAS: Ejecutar cada minuto

    console.log('Ejecutando tarea programada (7:00 AM): Buscando mantenimientos...');
    
    try {
      // 1. Definir las fechas clave
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalizar al inicio del día

      const fiveDaysFromNow = new Date(today);
      fiveDaysFromNow.setDate(today.getDate() + 5);

      const oneDayFromNow = new Date(today);
      oneDayFromNow.setDate(today.getDate() + 1);

      // 2. Buscar mantenimientos que coincidan con 5 días o 1 día
      const maintenances = await prisma.maintenance.findMany({
        where: {
          estado: 'pendiente',
          OR: [
            { fecha_programada: { gte: fiveDaysFromNow, lt: new Date(fiveDaysFromNow.getTime() + 24 * 60 * 60 * 1000) } }, // 5 días
            { fecha_programada: { gte: oneDayFromNow, lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000) } }  // 1 día
          ]
        },
        include: {
          device: { // Incluir dispositivo
            include: {
              usuario: true, // Incluir usuario asignado
              departamento: true, // Incluir departamento
              tipo: true, // Incluir tipo de dispositivo
            }
          }
        }
      });

      if (maintenances.length === 0) {
        console.log("No hay mantenimientos programados para enviar recordatorios hoy.");
        return;
      }

      console.log(`Se encontraron ${maintenances.length} mantenimientos para notificar.`);

      // 3. Procesar cada mantenimiento
      for (const maint of maintenances) {
        const device = maint.device;
        if (!device || !device.departamentoId) {
          console.log(`Mantenimiento ID ${maint.id} omitido (sin dispositivo o departamento).`);
          continue;
        }

        // 4. Buscar al Jefe de Área
        const manager = await prisma.user.findFirst({
          where: {
            departamentoId: device.departamentoId,
            es_jefe_de_area: true,
          }
        });

        if (manager && manager.correo) {
          // 5. Determinar cuántos días faltan y enviar el correo
          const maintDate = new Date(maint.fecha_programada);
          maintDate.setHours(0, 0, 0, 0);

          if (maintDate.getTime() === fiveDaysFromNow.getTime()) {
            await sendMaintenanceReminder(maint, manager, 5);
          } else if (maintDate.getTime() === oneDayFromNow.getTime()) {
            await sendMaintenanceReminder(maint, manager, 1);
          }
        }
      }

    } catch (cronError) {
      console.error("Error durante la ejecución de la tarea programada:", cronError);
    }
  }, {
    scheduled: true,
    timezone: "America/Cancun" // Asegúrate de usar tu zona horaria
  });
  // 👆 --- FIN DE CÓDIGO NUEVO --- 👆
});