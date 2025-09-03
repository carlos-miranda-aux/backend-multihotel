import { Router } from "express";
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from "../controllers/department.controller.js";

const router = Router();

// Usando tus rutas personalizadas
router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDepartments);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDepartment);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createDepartment);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), updateDepartment);
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN"]), deleteDepartment);

export default router;

