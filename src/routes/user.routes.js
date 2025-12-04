import { Router } from "express";
import multer from "multer";
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  exportUsers,
  getAllUsers,
  importUsers
} from "../controllers/user.controller.js";
import { verifyRole, verifyToken } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const ALL_READ = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX, ROLES.CORP_VIEWER, ROLES.HOTEL_GUEST];
const EDIT_ACCESS = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.HOTEL_AUX];

router.get("/get", verifyToken, verifyRole(ALL_READ), getUsers);
router.get("/get/all", verifyToken, verifyRole(ALL_READ), getAllUsers);
router.get("/get/:id", verifyToken, verifyRole(ALL_READ), getUser);

router.post("/post", verifyToken, verifyRole(EDIT_ACCESS), createUser);
router.put("/put/:id", verifyToken, verifyRole(EDIT_ACCESS), updateUser);
router.delete("/delete/:id", verifyToken, verifyRole(EDIT_ACCESS), deleteUser);

router.get("/export/all", verifyToken, verifyRole(EDIT_ACCESS), exportUsers);
router.post("/import", verifyToken, verifyRole([ROLES.ROOT, ROLES.HOTEL_ADMIN]), upload.single("file"), importUsers);

export default router;