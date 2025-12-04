import { Router } from "express";
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from "../controllers/department.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

// Definición de permisos
const READ_ALL = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX, ROLES.CORP_VIEWER, ROLES.HOTEL_GUEST];
const ADMIN_ONLY = [ROLES.ROOT, ROLES.HOTEL_ADMIN]; // Solo Admins crean/borran estructura

router.get("/get", verifyToken, verifyRole(READ_ALL), getDepartments);
router.get("/get/:id", verifyToken, verifyRole(READ_ALL), getDepartment);
router.post("/post", verifyToken, verifyRole(ADMIN_ONLY), createDepartment);
router.put("/put/:id", verifyToken, verifyRole(ADMIN_ONLY), updateDepartment);
router.delete("/delete/:id", verifyToken, verifyRole(ADMIN_ONLY), deleteDepartment);

export default router;