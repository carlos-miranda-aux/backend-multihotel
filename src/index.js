import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./PrismaClient.js";
import bcrypt from "bcryptjs";
import cron from "node-cron"; 
import { sendMaintenanceReminder } from "./utils/email.service.js"; 
import { preloadMasterData } from "./utils/preloadData.js";

// Importar rutas
import departmentRoutes from "./routes/department.routes.js";
import areaRoutes from "./routes/area.routes.js"; // 👈 NUEVA RUTA
import osRoutes from "./routes/operatingSystem.routes.js";
import deviceTypeRoutes from "./routes/deviceType.routes.js";
import deviceStatusRoutes from "./routes/deviceStatus.routes.js";
import userRoutes from "./routes/user.routes.js";
import devicesRoutes from "./routes/devices.routes.js";
import maintenanceRoutes from "./routes/maintenance.routes.js";
import disposalRoutes from "./routes/disposal.routes.js";
import authRoutes from "./routes/auth.routes.js";

import { errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// rutas
app.use("/api/departments", departmentRoutes);
app.use("/api/areas", areaRoutes); // 👈 USAR RUTA
app.use("/api/operating-systems", osRoutes);
app.use("/api/device-types", deviceTypeRoutes);
app.use("/api/device-status", deviceStatusRoutes);
app.use("/api/users", userRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/maintenances", maintenanceRoutes);
app.use("/api/disposals", disposalRoutes);
app.use("/api/auth", authRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);

  try {
    await prisma.$connect();
    console.log("Conectado a la BD");

    await preloadMasterData();

    const superAdmin = await prisma.userSistema.findFirst({
      where: { username: "admin", rol: "ADMIN" }
    });

    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash("admin", 10);
      const user = await prisma.userSistema.create({
        data: {
          username: "admin",
          email: "admin@simet.cpc",
          password: hashedPassword,
          nombre: "Administrador",
          rol: "ADMIN",
        },
      });
      console.log("Superusuario creado:", user.username);
    } 
  } catch (err) {
    console.error("Error al conectar a la DB o crear superusuario:", err);
  }

  // --- TAREA PROGRAMADA (CRON) ---
  console.log("Tarea programada de recordatorios configurada (9:00 AM).");
  
  //cron.schedule('* * * * *', async () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Ejecutando tarea programada (9:00 AM)...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const fiveDaysFromNow = new Date(today);
      fiveDaysFromNow.setDate(today.getDate() + 5);

      const oneDayFromNow = new Date(today);
      oneDayFromNow.setDate(today.getDate() + 1);

      const maintenances = await prisma.maintenance.findMany({
        where: {
          estado: 'pendiente',
          OR: [
            { fecha_programada: { gte: fiveDaysFromNow, lt: new Date(fiveDaysFromNow.getTime() + 24 * 60 * 60 * 1000) } },
            { fecha_programada: { gte: oneDayFromNow, lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000) } }
          ]
        },
        include: {
          device: { 
            include: {
              usuario: true,
              area: true, // 👈 Incluimos el ÁREA
              tipo: true,
            }
          }
        }
      });

      if (maintenances.length === 0) return;

      for (const maint of maintenances) {
        const device = maint.device;
        // Validamos que el dispositivo tenga un área asignada
        if (!device || !device.areaId) {
          continue;
        }

        // 👈 BÚSQUEDA ACTUALIZADA: Buscamos al jefe de ESTA ÁREA
        const manager = await prisma.user.findFirst({
          where: {
            areaId: device.areaId, // Coincide con el área del equipo
            es_jefe_de_area: true,
          }
        });

        if (manager && manager.correo) {
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
      console.error("Error CRON:", cronError);
    }
  }, {
    scheduled: true,
    timezone: "America/Cancun"
  });
});