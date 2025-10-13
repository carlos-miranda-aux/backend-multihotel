import { Router } from "express";
import { createUser, login, deleteUser, getUsers, updateUserController} from "../controllers/auth.controller.js";
import { verifyToken, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas públicas
router.post("/login", login);

// Rutas protegidas solo con token
router.get("/get", verifyToken, verifyRole(["EDITOR", "ADMIN"]), getUsers);
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN"]), deleteUser);
router.post("/create-user", verifyToken, verifyRole(["ADMIN"]), createUser);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN"]), updateUserController);
export default router;
