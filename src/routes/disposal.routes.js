// routes/disposal.routes.js
import { Router } from "express";
import {
  getDisposals,
  getDisposal,
  updateDisposal,
  deleteDisposal,
  exportDisposalsExcel
} from "../controllers/disposal.controller.js";
import {verifyRole, verifyToken} from "../middlewares/auth.middleware.js"

const router = Router();

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDisposals);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDisposal);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]),updateDisposal);
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN"]), deleteDisposal);

// Exportar a Excel
router.get("/export/excel", exportDisposalsExcel);

export default router;
