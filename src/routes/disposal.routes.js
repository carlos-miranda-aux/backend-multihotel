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

router.get("/get", getDisposals);
router.get("/get/:id", getDisposal);
router.post("/post", createDisposal);
router.put("/put/:id", updateDisposal);
router.delete("/delete/:id", deleteDisposal);

// Exportar a Excel
router.get("/export/excel", exportDisposalsExcel);

export default router;
