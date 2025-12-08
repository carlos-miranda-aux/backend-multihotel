export const errorHandler = (err, req, res, next) => {

  console.error("🔥 Error del Sistema:", err);

  if (err.code === 'P2002') {
    const target = err.meta?.target;
    
    if (String(target).includes('email') || String(target).includes('correo')) {
        return res.status(400).json({ error: "Este correo electrónico ya está registrado en el sistema." });
    }
    if (String(target).includes('username') || String(target).includes('usuario_login')) {
        return res.status(400).json({ error: "Este nombre de usuario ya está en uso. Intenta con otro." });
    }
    if (String(target).includes('numero_serie')) {
        return res.status(400).json({ error: "Ya existe un equipo registrado con este Número de Serie en este hotel." });
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

  if (err.code === 'P2003') {
    return res.status(400).json({ 
      error: "No se puede eliminar o modificar este registro porque está siendo utilizado en otra parte del sistema (ej. tiene equipos, usuarios o historial asignado)." 
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: "La información solicitada no existe o ya fue eliminada." });
  }

  if (err.message) {

      if (err.message.includes("is not valid")) {
          return res.status(400).json({ error: "Uno de los datos ingresados no tiene el formato correcto." });
      }

      return res.status(400).json({ error: err.message });
  }

  res.status(500).json({
    error: "Ocurrió un problema inesperado en el servidor. Por favor intenta más tarde o contacta a soporte.",
  });
};