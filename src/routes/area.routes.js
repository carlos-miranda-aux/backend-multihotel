import { Router } from "express";
import { getAreas, getArea, createArea, updateArea, deleteArea } from "../controllers/area.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();
const READ_ALL = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX, ROLES.CORP_VIEWER, ROLES.HOTEL_GUEST];
const ADMIN_ONLY = [ROLES.ROOT, ROLES.HOTEL_ADMIN];

router.get("/get", verifyToken, verifyRole(READ_ALL), getAreas);
router.get("/get/:id", verifyToken, verifyRole(READ_ALL), getArea);
router.post("/post", verifyToken, verifyRole(ADMIN_ONLY), createArea);
router.put("/put/:id", verifyToken, verifyRole(ADMIN_ONLY), updateArea);
router.delete("/delete/:id", verifyToken, verifyRole(ADMIN_ONLY), deleteArea);

export default router;