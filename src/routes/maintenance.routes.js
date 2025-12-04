import { Router } from "express";
import {
  getMaintenances,
  getMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  exportMaintenances,
  exportIndividualMaintenance
} from "../controllers/maintenance.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

const ALL_READ = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX, ROLES.CORP_VIEWER, ROLES.HOTEL_GUEST];
const EDIT_ACCESS = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX];

router.get("/get", verifyToken, verifyRole(ALL_READ), getMaintenances);
router.get("/get/:id", verifyToken, verifyRole(ALL_READ), getMaintenance);
router.post("/post", verifyToken, verifyRole(EDIT_ACCESS), createMaintenance);
router.put("/put/:id", verifyToken, verifyRole(EDIT_ACCESS), updateMaintenance);
router.delete("/delete/:id", verifyToken, verifyRole(EDIT_ACCESS), deleteMaintenance);
router.get("/export/all", verifyToken, verifyRole(EDIT_ACCESS), exportMaintenances);
router.get("/export/individual/:id", verifyToken, verifyRole(EDIT_ACCESS), exportIndividualMaintenance);

export default router;