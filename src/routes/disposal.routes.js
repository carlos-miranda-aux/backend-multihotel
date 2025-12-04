import { Router } from "express";
import {
  getDisposals,
  getDisposal,
  updateDisposal,
  deleteDisposal,
  exportDisposalsExcel
} from "../controllers/disposal.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();

const READ_ALL = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX, ROLES.CORP_VIEWER];
const EDIT_ACCESS = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX];
const ADMIN_ONLY = [ROLES.ROOT, ROLES.HOTEL_ADMIN];

router.get("/get", verifyToken, verifyRole(READ_ALL), getDisposals);
router.get("/get/:id", verifyToken, verifyRole(READ_ALL), getDisposal);
// Actualizar detalles de la baja (motivo, observaciones)
router.put("/put/:id", verifyToken, verifyRole(EDIT_ACCESS), updateDisposal);
// Eliminar registro de baja (peligroso)
router.delete("/delete/:id", verifyToken, verifyRole(ADMIN_ONLY), deleteDisposal);

// Exportar
router.get("/export/excel", verifyToken, verifyRole(READ_ALL), exportDisposalsExcel);

export default router;