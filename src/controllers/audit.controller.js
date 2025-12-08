import * as auditService from "../services/audit.service.js";

export const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; 
    const skip = (page - 1) * limit;
    const entity = req.query.entity || undefined;
    const userId = req.query.userId || undefined;

    const hotelId = req.query.hotelId || undefined;

    const { logs, totalCount } = await auditService.getAuditLogs({
      skip,
      take: limit,
      entity,
      userId,
      hotelId
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