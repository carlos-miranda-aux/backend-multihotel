// src/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import * as auditService from "../services/audit.service.js";
import { ROLES } from "../config/constants.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecreto";

export const verifyToken = (req, res, next) => {
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
    
    // Header que envía el frontend cuando seleccionas un hotel
    const requestedHotelId = req.headers['x-hotel-id'];
    
    let currentContextHotelId = null;

    // 1. Si es ROOT o Global Viewer, acceso total.
    if (decoded.rol === ROLES.ROOT || decoded.rol === ROLES.CORP_VIEWER) {
        if (requestedHotelId) {
            currentContextHotelId = Number(requestedHotelId);
        }
    } 
    // 2. Si es Admin Local o Regional
    else {
        // Obtenemos la lista de IDs permitidos del token
        // Fallback: si allowedHotels no existe (tokens viejos), mapeamos hotels
        const allowedIds = decoded.allowedHotels || (decoded.hotels ? decoded.hotels.map(h => h.id) : []);

        if (requestedHotelId) {
            const reqId = Number(requestedHotelId);
            
            // 🔥 VALIDACIÓN CRÍTICA: ¿Tiene permiso para este hotel?
            if (!allowedIds.includes(reqId)) {
                return res.status(403).json({ error: `Acceso denegado al hotel ID: ${reqId}. No tienes permisos asignados.` });
            }
            currentContextHotelId = reqId;
        } else {
            // Si no pide hotel específico, pero es un endpoint que requiere contexto (ej. crear usuario),
            // podríamos asignar el primero por defecto, o dejarlo null si es una vista "global" permitida.
            // Para usuarios mono-hotel, forzamos su único hotel si no envían header (seguridad extra).
            if (allowedIds.length === 1) {
                currentContextHotelId = allowedIds[0];
            }
        }
    }

    // Inyectamos el usuario con el hotelId activo
    req.user = { 
        ...decoded, 
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