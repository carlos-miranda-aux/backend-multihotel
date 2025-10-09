import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Verifica si el token es válido
export const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ error: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Guardamos los datos del usuario dentro del request
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

// ✅ Verifica si el rol tiene permisos
export const verifyRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    next();
  };
};
