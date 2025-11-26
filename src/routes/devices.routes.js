// src/routes/devices.routes.js
import { Router } from "express";
import multer from "multer";
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  getAllActiveDeviceNames, // 👈 CORRECCIÓN: Importar
  exportInactiveDevices,
  exportAllDevices,
  importDevices
} from "../controllers/device.controller.js";
import {verifyRole, verifyToken} from "../middlewares/auth.middleware.js"

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get("/get",verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevices);
// 👈 CORRECCIÓN: Añadir la nueva ruta ANTES de /get/:id
router.get("/get/all-names", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getAllActiveDeviceNames);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevice);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createDevice);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]),updateDevice);
// (la ruta DELETE ya está comentada, lo cual es correcto)
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN"]), deleteDevice);
//Exportar bajas en excel
router.get("/export/inactivos", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportInactiveDevices);
router.get("/export/all", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportAllDevices);

router.post("/import", verifyToken, verifyRole(["ADMIN"]), upload.single("file"), importDevices);

export default router;