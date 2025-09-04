import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./PrismaClient.js";


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
import auditRoutes from "./routes/audit.routes.js"

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
app.use("/api/audit",auditRoutes)


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

prisma.$connect()
  .then(() => console.log("Conectado a la BD"))
  .catch(err => console.log("Error en la conexion"))
