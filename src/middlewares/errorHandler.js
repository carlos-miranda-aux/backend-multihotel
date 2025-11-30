// src/middlewares/errorHandler.js

export const errorHandler = (err, req, res, next) => {
  // 1. Log del error en consola (para que tú como desarrollador veas qué pasó)
  console.error("🔥 Error detectado:", err);

  // 2. Manejo de Errores de Prisma conocidos
  if (err.code === 'P2002') {
    // Violación de restricción única (ej. email duplicado, nombre de área duplicado)
    const target = err.meta?.target ? `en el campo: ${err.meta.target}` : '';
    return res.status(400).json({ 
      error: `Dato duplicado. El registro ya existe ${target}` 
    });
  }

  if (err.code === 'P2003') {
    // Violación de llave foránea (ej. intentar borrar un Depto que tiene Áreas)
    return res.status(400).json({ 
      error: "No se puede eliminar o modificar este registro porque está vinculado a otros datos." 
    });
  }

  if (err.code === 'P2025') {
    // Registro no encontrado (cuando Prisma lanza error explícito)
    return res.status(404).json({ error: "Registro no encontrado." });
  }

  // 3. Errores personalizados (si lanzas throw new Error("Mensaje") en tus servicios)
  // Puedes decidir que ciertos errores sean 400 o 404 según el mensaje, 
  // o simplemente devolver el mensaje del error.
  if (err.message === "Dispositivo no encontrado" || err.message.includes("no encontrado")) {
      return res.status(404).json({ error: err.message });
  }
  
  if (err.message.includes("No se puede reactivar") || err.message.includes("permisos")) {
      return res.status(403).json({ error: err.message });
  }

  // 4. Error Genérico (500) para todo lo demás
  // En producción, podrías ocultar 'err.message' para no dar pistas a hackers
  res.status(500).json({
    error: "Error interno del servidor",
    detail: err.message 
  });
};