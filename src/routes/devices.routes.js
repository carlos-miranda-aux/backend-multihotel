import { Router } from "express";
import multer from "multer";
import {
  getDevices, getDevice, createDevice, updateDevice, deleteDevice,
  getAllActiveDeviceNames, exportInactiveDevices, exportAllDevices,
  importDevices, exportCorrectiveAnalysis, getPandaStatus, getDashboardData,
  exportResguardo // IMPORTAR
} from "../controllers/device.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { validateCreateDevice, validateUpdateDevice } from "../validators/device.validator.js";
import { ROLES } from "../config/constants.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

const READ_ALL = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX, ROLES.CORP_VIEWER, ROLES.HOTEL_GUEST];
const EDIT_ACCESS = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX];
const ADMIN_ONLY = [ROLES.ROOT, ROLES.HOTEL_ADMIN];

router.get("/get", verifyToken, verifyRole(READ_ALL), getDevices);
router.get("/get/all-names", verifyToken, verifyRole(READ_ALL), getAllActiveDeviceNames);
router.get("/get/panda-status", verifyToken, verifyRole(READ_ALL), getPandaStatus); 
router.get("/get/dashboard-stats", verifyToken, verifyRole(READ_ALL), getDashboardData);
router.get("/get/:id", verifyToken, verifyRole(READ_ALL), getDevice);

router.post("/post", verifyToken, verifyRole(EDIT_ACCESS), validateCreateDevice, createDevice);
router.put("/put/:id", verifyToken, verifyRole(EDIT_ACCESS), validateUpdateDevice, updateDevice);
router.delete("/delete/:id", verifyToken, verifyRole(ADMIN_ONLY), deleteDevice);

router.get("/export/inactivos", verifyToken, verifyRole(EDIT_ACCESS), exportInactiveDevices);
router.get("/export/all", verifyToken, verifyRole(EDIT_ACCESS), exportAllDevices);
router.post("/import", verifyToken, verifyRole(ADMIN_ONLY), upload.single("file"), importDevices);
router.get("/export/corrective-analysis", verifyToken, verifyRole(EDIT_ACCESS), exportCorrectiveAnalysis);

router.get("/export/resguardo/:id", verifyToken, verifyRole(READ_ALL), exportResguardo);

export default router;