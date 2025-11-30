// src/routes/devices.routes.js
import { Router } from "express";
import multer from "multer";
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  getAllActiveDeviceNames, 
  exportInactiveDevices,
  exportAllDevices,
  importDevices,
  exportCorrectiveAnalysis,
  getPandaStatus
} from "../controllers/device.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
// 👇 IMPORTAMOS LOS VALIDADORES
import { validateCreateDevice, validateUpdateDevice } from "../validators/device.validator.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevices);
router.get("/get/all-names", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getAllActiveDeviceNames);
router.get("/get/panda-status", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getPandaStatus); 
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevice);

// 👇 APLICAMOS MIDDLEWARE DE VALIDACIÓN ANTES DEL CONTROLADOR
router.post("/post", 
    verifyToken, 
    verifyRole(["ADMIN", "EDITOR"]), 
    validateCreateDevice, // <--- Valida aquí
    createDevice
);

router.put("/put/:id", 
    verifyToken, 
    verifyRole(["ADMIN", "EDITOR"]), 
    validateUpdateDevice, // <--- Valida aquí
    updateDevice
);

router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN"]), deleteDevice);
router.get("/export/inactivos", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportInactiveDevices);
router.get("/export/all", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportAllDevices);

router.post("/import", verifyToken, verifyRole(["ADMIN"]), upload.single("file"), importDevices);

router.get("/export/corrective-analysis", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportCorrectiveAnalysis);

export default router;