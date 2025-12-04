import { Router } from "express";
import { 
    createUser, login, deleteUser, getUsers, getUser, updateUserController, exportSystemUsers 
} from "../controllers/auth.controller.js";
import { verifyToken, verifyRole } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

// Rutas públicas
router.post("/login", login);

// Gestión de Usuarios del Sistema (Solo Admins)
const ADMIN_ACCESS = [ROLES.ROOT, ROLES.HOTEL_ADMIN];

router.get("/get", verifyToken, verifyRole(ADMIN_ACCESS), getUsers);
router.get("/get/:id", verifyToken, verifyRole(ADMIN_ACCESS), getUser);
router.post("/create-user", verifyToken, verifyRole(ADMIN_ACCESS), createUser);
router.put("/put/:id", verifyToken, verifyRole(ADMIN_ACCESS), updateUserController);
router.delete("/delete/:id", verifyToken, verifyRole(ADMIN_ACCESS), deleteUser);
router.get("/export/all", verifyToken, verifyRole(ADMIN_ACCESS), exportSystemUsers);

export default router;