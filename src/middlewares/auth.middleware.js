import jwt from "jsonwebtoken";
import prisma from "../PrismaClient.js";
import { ROLES } from "../config/constants.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const verifyToken = async (req, res, next) => {
  const token = req.headers["x-access-token"] || req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ error: "Se requiere un token para autenticarse" });
  }

  try {
    const bearerToken = token.startsWith("Bearer ") ? token.slice(7, token.length) : token;
    const decoded = jwt.verify(bearerToken, JWT_SECRET);
    
    const user = await prisma.userSistema.findUnique({
        where: { id: decoded.id },
        include: { 
            hotels: { 
                select: { id: true, nombre: true, codigo: true } 
            } 
        }
    });

    if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado o token inválido." });
    }

    if (user.deletedAt) { 
         return res.status(401).json({ error: "Cuenta desactivada." });
    }

    const hotelHeader = req.headers['x-hotel-id'];

    if (hotelHeader && hotelHeader !== 'null' && hotelHeader !== 'undefined') {
        const requestedHotelId = Number(hotelHeader);

        if (user.rol !== ROLES.ROOT && user.rol !== ROLES.CORP_VIEWER) {
            const hasAccess = user.hotels.some(h => h.id === requestedHotelId);
            if (!hasAccess) {
                return res.status(403).json({ error: "Acceso denegado a este entorno de hotel." });
            }
        }

        user.hotelId = requestedHotelId;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    return res.status(401).json({ error: "Sesión expirada o inválida." });
  }
};

export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tienes permisos suficientes para esta acción." });
    }
    next();
  };
};