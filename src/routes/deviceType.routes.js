import { Router } from "express";
import {
  getDeviceTypes,
  getDeviceType,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType,
} from "../controllers/deviceType.controller.js";

const router = Router();

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDeviceTypes);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDeviceType);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createDeviceType);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), updateDeviceType);
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN"]), deleteDeviceType);

export default router;
