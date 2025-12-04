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
    
    // decoded trae: { id, username, rol, allowedHotels: [1, 2, 3] }
    
    // 🛡️ LÓGICA DE CONTEXTO (HOTEL ACTIVO)
    // El frontend nos dice en qué hotel quiere trabajar vía header 'x-hotel-id'
    const requestedHotelId = req.headers['x-hotel-id'];
    
    let currentContextHotelId = null;

    if (decoded.rol === ROLES.ROOT || decoded.rol === ROLES.CORP_VIEWER) {
        // Si es Root/Global, puede suplantar cualquier hotel que pida en el header
        if (requestedHotelId) {
            currentContextHotelId = Number(requestedHotelId);
        }
        // Si no envía header, currentContextHotelId es null (Vista Global)
    } else {
        // Si es Usuario Regional/Local
        if (requestedHotelId) {
            // Verificamos que el hotel pedido esté en su lista de permitidos
            const hasAccess = decoded.allowedHotels.includes(Number(requestedHotelId));
            
            if (!hasAccess) {
                return res.status(403).json({ error: "No tienes acceso al hotel seleccionado." });
            }
            currentContextHotelId = Number(requestedHotelId);
        } else {
            // Si no envía header, por seguridad no asignamos ninguno (o podríamos asignar el primero por defecto)
            // Para evitar errores en servicios que requieren hotelId, es mejor forzar que el front lo envíe.
            // Pero para lecturas generales, lo dejamos en null.
            currentContextHotelId = null;
        }
    }

    // Inyectamos el usuario con el hotelId "falso" activo para que los servicios crean que es un admin de ese hotel único
    req.user = { 
        ...decoded, 
        hotelId: currentContextHotelId // 👈 Esto hace la magia
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
              details: `Acceso denegado. ${req.method} ${req.originalUrl}`
          });
      } catch (e) {}
      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    next();
  };
};