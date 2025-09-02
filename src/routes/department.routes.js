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
router.get("/get", getDepartments);
router.get("/get/:id", getDepartment);
router.post("/post", createDepartment);
router.put("/put/:id", updateDepartment);
router.delete("/delete/:id", deleteDepartment);

export default router;

