import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { verifyToken, verifyRole } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/constants.js";

const router = Router();
const AUDIT_ACCESS = [ROLES.ROOT, ROLES.HOTEL_ADMIN, ROLES.CORP_VIEWER];

router.get("/", verifyToken, verifyRole(AUDIT_ACCESS), getAuditLogs);

export default router;