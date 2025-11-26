// src/routes/user.routes.js
import { Router } from "express";
import multer from "multer";
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  exportUsers,
  getAllUsers, // 👈 CORRECCIÓN: Importar
  importUsers
} from "../controllers/user.controller.js";
import {verifyRole, verifyToken} from "../middlewares/auth.middleware.js"
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getUsers);
// 👈 CORRECCIÓN: Añadir la nueva ruta ANTES de /get/:id
router.get("/get/all", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getAllUsers);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getUser);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createUser);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), updateUser);
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), deleteUser);
router.get("/export/all", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportUsers);

router.post("/import", verifyToken, verifyRole(["ADMIN"]), upload.single("file"), importUsers);

export default router;