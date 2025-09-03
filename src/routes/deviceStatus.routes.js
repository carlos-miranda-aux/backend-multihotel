import { Router } from "express";
import {
  getDeviceStatuses,
  getDeviceStatus,
  createDeviceStatus,
  updateDeviceStatus,
  deleteDeviceStatus,
} from "../controllers/deviceStatus.controller.js";

const router = Router();

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDeviceStatuses);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDeviceStatus);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createDeviceStatus);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), updateDeviceStatus);
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN"]), deleteDeviceStatus);

export default router;
