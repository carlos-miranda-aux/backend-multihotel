// src/controllers/audit.controller.js
import prisma from "../PrismaClient.js";

// 📌 Obtener todos los logs de auditoría
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true }, // Incluye información del usuario
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Obtener logs por usuario
export const getAuditLogsByUser = async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const logs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Filtrar logs por recurso y/o acción
export const getAuditLogsByResource = async (req, res) => {
  const { resource, action } = req.query; // /filter?resource=Maintenance&action=CREATE
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        resource,
        ...(action && { action }),
      },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Filtrar logs por rango de fechas
export const getAuditLogsByDate = async (req, res) => {
  const { startDate, endDate } = req.query; // formato YYYY-MM-DD
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
