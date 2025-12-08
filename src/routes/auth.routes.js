import { Router } from "express";
import { 
    createUser, 
    login, 
    deleteUser, 
    getUsers, 
    getUser, 
    updateUserController, 
    exportSystemUsers,
    updatePassword
} from "../controllers/auth.controller.js";
import { verifyToken, verifyRole } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

router.post("/login", login);

const ADMIN_ACCESS = [ROLES.ROOT, ROLES.HOTEL_ADMIN];

router.get("/get", verifyToken, verifyRole(ADMIN_ACCESS), getUsers);
router.get("/get/:id", verifyToken, verifyRole(ADMIN_ACCESS), getUser);
router.post("/create-user", verifyToken, verifyRole(ADMIN_ACCESS), createUser);
router.put("/put/:id", verifyToken, verifyRole(ADMIN_ACCESS), updateUserController);
router.delete("/delete/:id", verifyToken, verifyRole(ADMIN_ACCESS), deleteUser);
router.get("/export/all", verifyToken, verifyRole(ADMIN_ACCESS), exportSystemUsers);

router.put("/put/:id/password", verifyToken, updatePassword);

export default router;