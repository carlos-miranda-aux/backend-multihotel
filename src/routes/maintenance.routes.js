import { Router } from "express";
import {
  getMaintenances,
  getMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from "../controllers/maintenance.controller.js";

const router = Router();

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getMaintenances);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getMaintenance);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createMaintenance);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), updateMaintenance);
router.delete("/delete/:id",  verifyToken, verifyRole(["ADMIN", "EDITOR"]),deleteMaintenance);

export default router;
