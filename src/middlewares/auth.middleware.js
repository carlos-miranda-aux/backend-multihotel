// src/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import prisma from "../PrismaClient.js"; // 👈 Importamos Prisma
import * as auditService from "../services/audit.service.js";
import { ROLES } from "../config/constants.js";

const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro"; // Asegura que coincida con el controller

export const verifyToken = async (req, res, next) => { // 👈 Convertimos a ASYNC
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
    
    // 🔥 CORRECCIÓN CRÍTICA: 
    // En lugar de confiar en el token, buscamos al usuario y sus hoteles en la BD.
    const user = await prisma.userSistema.findUnique({
        where: { id: decoded.id, deletedAt: null },
        include: { hotels: true } // Traemos la relación de hoteles
    });

    if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado o inactivo." });
    }

    // Header que envía el frontend cuando seleccionas un hotel
    const requestedHotelId = req.headers['x-hotel-id'];
    let currentContextHotelId = null;

    // 1. Si es ROOT o Global Viewer, acceso total.
    if (user.rol === ROLES.ROOT || user.rol === ROLES.CORP_VIEWER) {
        if (requestedHotelId) {
            currentContextHotelId = Number(requestedHotelId);
        }
    } 
    // 2. Si es Admin Local o Regional
    else {
        // Obtenemos la lista de IDs permitidos DESDE LA BD
        const allowedIds = user.hotels.map(h => h.id);

        if (requestedHotelId) {
            const reqId = Number(requestedHotelId);
            
            // Validar si tiene permiso para el hotel solicitado
            if (!allowedIds.includes(reqId)) {
                return res.status(403).json({ error: `Acceso denegado al hotel ID: ${reqId}. No tienes permisos asignados.` });
            }
            currentContextHotelId = reqId;
        } else {
            // Si no pide hotel específico y solo tiene 1, lo forzamos.
            if (allowedIds.length === 1) {
                currentContextHotelId = allowedIds[0];
            }
        }
    }

    // Inyectamos el usuario COMPLETO (con array hotels actualizado) y el hotelId activo
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
          // Intento de auditoría (no bloqueante si falla)
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