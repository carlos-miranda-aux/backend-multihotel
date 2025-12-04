import { Router } from "express";
import {
  getOperatingSystems,
  getOperatingSystem,
  createOperatingSystem,
  updateOperatingSystem,
  deleteOperatingSystem
} from "../controllers/operatingSystem.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

const READ_ALL = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX, ROLES.CORP_VIEWER, ROLES.HOTEL_GUEST];
const CATALOG_ADMIN = [ROLES.ROOT, ROLES.HOTEL_ADMIN];

router.get("/get", verifyToken, verifyRole(READ_ALL), getOperatingSystems);
router.get("/get/:id", verifyToken, verifyRole(READ_ALL), getOperatingSystem);
router.post("/post", verifyToken, verifyRole(CATALOG_ADMIN), createOperatingSystem);
router.put("/put/:id", verifyToken, verifyRole(CATALOG_ADMIN), updateOperatingSystem);
router.delete("/delete/:id", verifyToken, verifyRole(CATALOG_ADMIN), deleteOperatingSystem);

export default router;