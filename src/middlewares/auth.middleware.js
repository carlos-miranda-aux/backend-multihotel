import jwt from "jsonwebtoken";
import prisma from "../PrismaClient.js";
import * as auditService from "../services/audit.service.js";
import { ROLES } from "../config/constants.js";

const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro";
export const verifyToken = async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers["authorization"]) {
    const authHeader = req.headers["authorization"];
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) return res.status(401).json({ error: "No autorizado: Token no proporcionado" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await prisma.userSistema.findUnique({
        where: { id: decoded.id, deletedAt: null },
        include: { hotels: true }
    });

    if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado o inactivo." });
    }

    const requestedHotelId = req.headers['x-hotel-id'];
    let currentContextHotelId = null;

    if (user.rol === ROLES.ROOT || user.rol === ROLES.CORP_VIEWER) {
        if (requestedHotelId) {
            currentContextHotelId = Number(requestedHotelId);
        }
    } 
    else {
        const allowedIds = user.hotels.map(h => h.id);

        if (requestedHotelId) {
            const reqId = Number(requestedHotelId);
            
            if (!allowedIds.includes(reqId)) {
                return res.status(403).json({ error: `Acceso denegado al hotel ID: ${reqId}. No tienes permisos asignados.` });
            }
            currentContextHotelId = reqId;
        } else {
            if (allowedIds.length === 1) {
                currentContextHotelId = allowedIds[0];
            }
        }
    }

    req.user = { 
        ...user, 
        hotelId: currentContextHotelId 
    };
    
    next();
  } catch (error) {
    console.error("Error Token:", error.message);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

export const verifyRole = (roles) => {
  return async (req, res, next) => { 
    if (!roles.includes(req.user.rol)) {
      try {
          await auditService.logActivity({
              action: 'UNAUTHORIZED_ACCESS',
              entity: 'Security',
              entityId: 0, 
              user: req.user,
              details: `Acceso denegado por ROL. ${req.method} ${req.originalUrl}`
          });
      } catch (e) {}
      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    next();
  };
};