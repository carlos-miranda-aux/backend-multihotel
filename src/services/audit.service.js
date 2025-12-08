import prisma from "../PrismaClient.js";

export const logActivity = async ({
  action,
  entity,
  entityId,
  oldData = null,
  newData = null,
  user = null,
  details = null
}) => {
  try {
    const actionsWithoutId = ['LOGIN_FAIL', 'UNAUTHORIZED_ACCESS', 'IMPORT'];

    if ((entityId === null || entityId === undefined) && !actionsWithoutId.includes(action)) {
        return;
    }

    let hotelIdToLog = null;

    if (user && user.hotelId) {

        hotelIdToLog = user.hotelId;
    } else {

        if (newData && newData.hotelId) {
            hotelIdToLog = newData.hotelId;
        } else if (oldData && oldData.hotelId) {
            hotelIdToLog = oldData.hotelId;
        }
    }

    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: (entityId !== null && entityId !== undefined) ? Number(entityId) : 0,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined, 
        newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
        userId: user ? Number(user.id) : null,
        hotelId: hotelIdToLog ? Number(hotelIdToLog) : null,
        details: details || null,
      }
    });
  } catch (error) {
    console.error("⚠️ Error al registrar auditoría:", error.message);
  }
};

export const getAuditLogs = async ({ skip, take, entity, userId, hotelId }, user) => {
  const where = {};

  if (user.hotelId) {

      where.hotelId = user.hotelId;
  } else {

      if (hotelId) {
          where.hotelId = Number(hotelId);
      }
  }

  if (entity) where.entity = entity;
  if (userId) where.userId = Number(userId);

  const [logs, totalCount] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { username: true, nombre: true, rol: true }
        },
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  return { logs, totalCount };
};