// src/routes/operatingSystem.routes.js
import { Router } from "express";
import {
  getOperatingSystemsController,
  getOperatingSystemController,
  createOperatingSystemController,
  updateOperatingSystemController,
  deleteOperatingSystemController
} from "../controllers/operatingSystem.controller.js";

const router = Router();

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getOperatingSystemsController);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getOperatingSystemController);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createOperatingSystemController);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), updateOperatingSystemController);
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN"]), deleteOperatingSystemController);

export default router;
