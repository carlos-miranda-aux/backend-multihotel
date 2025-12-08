import { Router } from "express";
import { 
    createUser, 
    login, 
    deleteUser, 
    getUsers, 
    getUser, 
    updateUserController, 
    exportSystemUsers,
    updatePassword // 👈 Importamos el nuevo controlador
} from "../controllers/auth.controller.js";
import { verifyToken, verifyRole } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

// Login es público
router.post("/login", login);

// Constante de roles administrativos para las rutas de gestión
const ADMIN_ACCESS = [ROLES.ROOT, ROLES.HOTEL_ADMIN];

// --- Rutas Administrativas (Requieren Rol Admin) ---
router.get("/get", verifyToken, verifyRole(ADMIN_ACCESS), getUsers);
router.get("/get/:id", verifyToken, verifyRole(ADMIN_ACCESS), getUser);
router.post("/create-user", verifyToken, verifyRole(ADMIN_ACCESS), createUser);
router.put("/put/:id", verifyToken, verifyRole(ADMIN_ACCESS), updateUserController); // Editar info general
router.delete("/delete/:id", verifyToken, verifyRole(ADMIN_ACCESS), deleteUser);
router.get("/export/all", verifyToken, verifyRole(ADMIN_ACCESS), exportSystemUsers);

// --- Rutas de Autoservicio (Accesibles por el usuario logueado) ---

// 👇 ACTUALIZAR CONTRASEÑA
// Quitamos 'verifyRole' para que cualquier usuario logueado pueda intentar cambiarla.
// El controlador validará si es SU propia cuenta o si es un admin.
router.put("/put/:id/password", verifyToken, updatePassword);

export default router;