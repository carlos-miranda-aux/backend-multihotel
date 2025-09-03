// routes/disposal.routes.js
import { Router } from "express";
import {
  getDisposals,
  getDisposal,
  createDisposal,
  updateDisposal,
  deleteDisposal,
  exportDisposalsExcel
} from "../controllers/disposal.controller.js";

const router = Router();

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDisposals);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDisposal);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createDisposal);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]),updateDisposal);
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), deleteDisposal);

// Exportar a Excel
router.get("/export/excel", exportDisposalsExcel);

export default router;
