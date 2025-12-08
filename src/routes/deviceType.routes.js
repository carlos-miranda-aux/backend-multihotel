import { Router } from "express";
import {
  getDeviceTypes,
  getDeviceType,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType,
} from "../controllers/deviceType.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

const READ_ALL = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX, ROLES.CORP_VIEWER, ROLES.HOTEL_GUEST];
const CATALOG_ADMIN = [ROLES.ROOT, ROLES.HOTEL_ADMIN]; 

router.get("/get", verifyToken, verifyRole(READ_ALL), getDeviceTypes);
router.get("/get/:id", verifyToken, verifyRole(READ_ALL), getDeviceType);
router.post("/post", verifyToken, verifyRole(CATALOG_ADMIN), createDeviceType);
router.put("/put/:id", verifyToken, verifyRole(CATALOG_ADMIN), updateDeviceType);
router.delete("/delete/:id", verifyToken, verifyRole(CATALOG_ADMIN), deleteDeviceType);

export default router;