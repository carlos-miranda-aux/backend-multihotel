import { Router } from "express";
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  // deleteDevice, // 👈 CORRECCIÓN: Importación eliminada
  exportInactiveDevices,
  exportAllDevices
} from "../controllers/device.controller.js";
import {verifyRole, verifyToken} from "../middlewares/auth.middleware.js"

const router = Router();

router.get("/get",verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevices);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getDevice);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createDevice);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]),updateDevice);
// router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]),deleteDevice); // 👈 CORRECCIÓN: Ruta eliminada

//Exportar bajas en excel
router.get("/export/inactivos", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportInactiveDevices);
router.get("/export/all", verifyToken, verifyRole(["ADMIN", "EDITOR"]), exportAllDevices);


export default router;