import { Router } from "express";
import { getAvailableHotels } from "../controllers/hotel.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Cualquier usuario logueado puede consultar QUÉ hoteles tiene disponibles
router.get("/list", verifyToken, getAvailableHotels);

export default router;