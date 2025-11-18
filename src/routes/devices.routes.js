// src/routes/devices.routes.js
import { Router } from "express";
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  getAllActiveDeviceNames, // 👈 CORRECCIÓN: Importar
  exportInactiveDevices,
  exportAllDevices
} from "../controllers/device.controller.js";
import {verifyRole, verifyToken} from "../middlewares/auth.middleware.js"

const router = Router();

router.get("/get",verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevices);
// 👈 CORRECCIÓN: Añadir la nueva ruta ANTES de /get/:id
router.get("/get/all-names", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getAllActiveDeviceNames);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevice);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createDevice);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]),updateDevice);
// (la ruta DELETE ya está comentada, lo cual es correcto)

//Exportar bajas en excel
router.get("/export/inactivos", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportInactiveDevices);
router.get("/export/all", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportAllDevices);


export default router;