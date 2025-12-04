// src/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import * as auditService from "../services/audit.service.js"; 

const JWT_SECRET = process.env.JWT_SECRET || "supersecreto";

// ✅ Verifica si el token es válido
export const verifyToken = (req, res, next) => {
  let token = null;

  // 1. Primero, intentar obtener el token de las cookies (si usas cookies)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } 
  // 2. Si no, buscar en el Header 'Authorization' (Estándar Bearer)
  else if (req.headers["authorization"]) {
    const authHeader = req.headers["authorization"];
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "No autorizado: Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Al decodificar, req.user tendrá: { id, username, rol, hotelId, ... }
    req.user = decoded; 
    
    next();
  } catch (error) {
    console.error("Error al verificar el token:", error.message);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

// ✅ Verifica si el rol tiene permisos (CON AUDITORÍA DE SEGURIDAD)
export const verifyRole = (roles) => {
  return async (req, res, next) => { 
    if (!roles.includes(req.user.rol)) {
      
      // 📝 REGISTRAR INTENTO DE ACCESO NO AUTORIZADO
      try {
          // Usamos try/catch para que un fallo en el log no tire la petición, 
          // pero el bloqueo 403 se mantiene firme.
          await auditService.logActivity({
              action: 'UNAUTHORIZED_ACCESS',
              entity: 'Security',
              entityId: 0, 
              user: req.user,
              details: `Acceso denegado. Intentó acceder a: ${req.method} ${req.originalUrl}. Roles requeridos: [${roles.join(', ')}]. Rol del usuario: ${req.user.rol}`
          });
      } catch (logError) {
          console.error("Error al registrar auditoría de seguridad:", logError.message);
      }

      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    next();
  };
};