import { Router } from "express";
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/get", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getUsers);
router.get("/get/:id", verifyToken, verifyRole(["ADMIN", "EDITOR", "USER"]), getUser);
router.post("/post", verifyToken, verifyRole(["ADMIN", "EDITOR"]), createUser);
router.put("/put/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), updateUser);
router.delete("/delete/:id", verifyToken, verifyRole(["ADMIN", "EDITOR"]), deleteUser);

export default router;
