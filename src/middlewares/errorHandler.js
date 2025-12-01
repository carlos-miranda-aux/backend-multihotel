// src/middlewares/errorHandler.js

export const errorHandler = (err, req, res, next) => {
  // 1. Log técnico para el desarrollador (se mantiene en servidor)
  console.error("🔥 Error del Sistema:", err);

  // 2. Manejo de Errores de Prisma (Base de Datos)
  
  // P2002: Violación de campo único (Duplicados)
  if (err.code === 'P2002') {
    const target = err.meta?.target;
    
    // Mapeo de campos específicos a mensajes amigables
    if (String(target).includes('email') || String(target).includes('correo')) {
        return res.status(400).json({ error: "Este correo electrónico ya está registrado en el sistema." });
    }
    if (String(target).includes('username') || String(target).includes('usuario_login')) {
        return res.status(400).json({ error: "Este nombre de usuario ya está en uso. Intenta con otro." });
    }
    if (String(target).includes('numero_serie')) {
        return res.status(400).json({ error: "Ya existe un equipo registrado con este Número de Serie." });
    }
    if (String(target).includes('etiqueta')) {
        return res.status(400).json({ error: "Ya existe un equipo con esta Etiqueta." });
    }
    if (String(target).includes('nombre')) {
        return res.status(400).json({ error: "Ya existe un registro con este Nombre (probablemente Área o Departamento)." });
    }

    return res.status(400).json({ 
      error: "Este registro ya existe en el sistema (dato duplicado)." 
    });
  }

  // P2003: Violación de Llave Foránea (Integridad Referencial)
  // Ocurre al intentar borrar algo que se está usando en otro lado
  if (err.code === 'P2003') {
    return res.status(400).json({ 
      error: "No se puede eliminar o modificar este registro porque está siendo utilizado en otra parte del sistema (ej. tiene equipos, usuarios o historial asignado)." 
    });
  }

  // P2025: Registro no encontrado
  if (err.code === 'P2025') {
    return res.status(404).json({ error: "La información solicitada no existe o ya fue eliminada." });
  }

  // 3. Errores lanzados manualmente (throw new Error)
  if (err.message) {
      // Filtramos mensajes técnicos comunes para no mostrarlos crudos
      if (err.message.includes("is not valid")) {
          return res.status(400).json({ error: "Uno de los datos ingresados no tiene el formato correcto." });
      }
      
      // Si el mensaje parece hecho por nosotros (ej. "Usuario no encontrado"), lo mostramos
      return res.status(400).json({ error: err.message });
  }

  // 4. Error Genérico (500)
  // Mensaje seguro para el usuario final
  res.status(500).json({
    error: "Ocurrió un problema inesperado en el servidor. Por favor intenta más tarde o contacta a soporte.",
  });
};