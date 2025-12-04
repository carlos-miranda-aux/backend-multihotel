import { Router } from "express";
import {
  getDeviceStatuses,
  getDeviceStatus,
  createDeviceStatus,
  updateDeviceStatus,
  deleteDeviceStatus,
} from "../controllers/deviceStatus.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

const READ_ALL = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX, ROLES.CORP_VIEWER, ROLES.HOTEL_GUEST];
const CATALOG_ADMIN = [ROLES.ROOT, ROLES.HOTEL_ADMIN];

router.get("/get", verifyToken, verifyRole(READ_ALL), getDeviceStatuses);
router.get("/get/:id", verifyToken, verifyRole(READ_ALL), getDeviceStatus);
router.post("/post", verifyToken, verifyRole(CATALOG_ADMIN), createDeviceStatus);
router.put("/put/:id", verifyToken, verifyRole(CATALOG_ADMIN), updateDeviceStatus);
router.delete("/delete/:id", verifyToken, verifyRole(CATALOG_ADMIN), deleteDeviceStatus);

export default router;