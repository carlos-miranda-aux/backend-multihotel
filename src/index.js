import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./PrismaClient.js";
import cron from "node-cron"; 
import helmet from "helmet"; 
import rateLimit from "express-rate-limit"; 
import compression from "compression"; 
import morgan from "morgan"; 

import { sendMaintenanceReminder } from "./utils/email.service.js"; 
import { preloadMasterData } from "./utils/preloadData.js";
import { MAINTENANCE_STATUS } from "./config/constants.js"; 

// Rutas
import departmentRoutes from "./routes/department.routes.js";
import areaRoutes from "./routes/area.routes.js"; 
import osRoutes from "./routes/operatingSystem.routes.js";
import deviceTypeRoutes from "./routes/deviceType.routes.js";
import deviceStatusRoutes from "./routes/deviceStatus.routes.js";
import userRoutes from "./routes/user.routes.js";
import devicesRoutes from "./routes/devices.routes.js";
import maintenanceRoutes from "./routes/maintenance.routes.js";
import disposalRoutes from "./routes/disposal.routes.js";
import authRoutes from "./routes/auth.routes.js";
import auditRoutes from "./routes/audit.routes.js"; 
import hotelRoutes from "./routes/hotel.routes.js";

import { errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();

// --- CONFIGURACIÓN DE SEGURIDAD Y MIDDLEWARES ---
app.set('trust proxy', 1)
// 1. Logs de peticiones
app.use(morgan("combined")); 

// 2. Cabeceras de seguridad HTTP
app.use(helmet());

// 3. Compresión Gzip
app.use(compression());

// 4. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5000, // Límite de peticiones por IP
  message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.",
  standardHeaders: true, // Informa el límite en las cabeceras `RateLimit-*`
  legacyHeaders: false, // Deshabilita las cabeceras `X-RateLimit-*`
});
app.use(limiter);

// 5. Configuración CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('Bloqueado por CORS'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// --- RUTAS ---
app.use("/api/departments", departmentRoutes);
app.use("/api/areas", areaRoutes); 
app.use("/api/operating-systems", osRoutes);
app.use("/api/device-types", deviceTypeRoutes);
app.use("/api/device-status", deviceStatusRoutes);
app.use("/api/users", userRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/maintenances", maintenanceRoutes);
app.use("/api/disposals", disposalRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/hotels", hotelRoutes);

app.use(errorHandler);

const PORT = process.env.PORT

app.listen(PORT, async () => {

  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  try {
    await prisma.$connect();
    // Carga datos iniciales si la BD está vacía
    await preloadMasterData();
  } catch (err) {
    console.error("Error al iniciar DB:", err);
  }

  // --- CRON JOBS ---
  cron.schedule('* * * * *', async () => {
 // cron.schedule('0 9 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const fiveDaysFromNow = new Date(today);
      fiveDaysFromNow.setDate(today.getDate() + 5);

      const oneDayFromNow = new Date(today);
      oneDayFromNow.setDate(today.getDate() + 1);

      const maintenances = await prisma.maintenance.findMany({
        where: {
          estado: MAINTENANCE_STATUS.PENDING, 
          deletedAt: null, 
          OR: [
            { fecha_programada: { gte: fiveDaysFromNow, lt: new Date(fiveDaysFromNow.getTime() + 24 * 60 * 60 * 1000) } },
            { fecha_programada: { gte: oneDayFromNow, lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000) } }
          ]
        },
        include: {
          device: { 
            include: {
              usuario: true,
              area: true, 
              tipo: true,
            }
          }
        }
      });

      if (maintenances.length > 0) {
        for (const maint of maintenances) {
            const device = maint.device;
            if (!device || !device.areaId) continue;
    
            const manager = await prisma.user.findFirst({
              where: {
                areaId: device.areaId,
                es_jefe_de_area: true,
                deletedAt: null 
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
      } else {
      }

    } catch (cronError) {
      console.error("Error en CRON:", cronError);
    }
  }, {
    scheduled: true,
    timezone: "America/Cancun"
  });
});