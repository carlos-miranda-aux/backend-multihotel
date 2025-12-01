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
  getPandaStatus,
  getDashboardData // 👈 IMPORTADO
} from "../controllers/device.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { validateCreateDevice, validateUpdateDevice } from "../validators/device.validator.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevices);
router.get("/get/all-names", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getAllActiveDeviceNames);
router.get("/get/panda-status", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getPandaStatus); 

// 👇 NUEVA RUTA OPTIMIZADA (ANTES DE /get/:id)
router.get("/get/dashboard-stats", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDashboardData);

router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevice);

router.post("/post", 
    verifyToken, 
    verifyRole(["ADMIN", "EDITOR"]), 
    validateCreateDevice, 
    createDevice
);

router.put("/put/:id", 
    verifyToken, 
    verifyRole(["ADMIN", "EDITOR"]), 
    validateUpdateDevice,
    updateDevice
);

router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN"]), deleteDevice);
router.get("/export/inactivos", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportInactiveDevices);
router.get("/export/all", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportAllDevices);

router.post("/import", verifyToken, verifyRole(["ADMIN"]), upload.single("file"), importDevices);

router.get("/export/corrective-analysis", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportCorrectiveAnalysis);

export default router;