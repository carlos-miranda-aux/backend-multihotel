// src/controllers/audit.controller.js
import * as auditService from "../services/audit.service.js";

export const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; 
    const skip = (page - 1) * limit;

    // Filtros opcionales que podrían venir del front
    const entity = req.query.entity || undefined;
    const userId = req.query.userId || undefined;
    
    // 🛡️ Filtro por hotel (Solo útil si eres ROOT/CORP, si eres Admin Local se ignora)
    const hotelId = req.query.hotelId || undefined;

    // Pasamos req.user y los filtros
    const { logs, totalCount } = await auditService.getAuditLogs({
      skip,
      take: limit,
      entity,
      userId,
      hotelId // 👈 Nuevo parámetro
    }, req.user);

    res.json({
      data: logs,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    next(error);
  }
};