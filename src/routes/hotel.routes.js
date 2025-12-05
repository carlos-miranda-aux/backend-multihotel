import { Router } from "express";
import { 
    getAvailableHotels, 
    getAllHotelsAdmin, 
    createHotel, 
    updateHotel, 
    deleteHotel 
} from "../controllers/hotel.controller.js";
import { verifyToken, verifyRole } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

// Endpoint público para selector (ya existente)
router.get("/list", verifyToken, getAvailableHotels);

// Endpoints administrativos (Solo ROOT)
router.get("/admin/list", verifyToken, verifyRole([ROLES.ROOT]), getAllHotelsAdmin);
router.post("/post", verifyToken, verifyRole([ROLES.ROOT]), createHotel);
router.put("/put/:id", verifyToken, verifyRole([ROLES.ROOT]), updateHotel);
router.delete("/delete/:id", verifyToken, verifyRole([ROLES.ROOT]), deleteHotel);

export default router;