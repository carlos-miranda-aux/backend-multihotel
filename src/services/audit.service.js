import prisma from "../PrismaClient.js";
import { ROLES } from "../config/constants.js"; // 👈 IMPORTANTE

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

  // --- FILTRO DE SEGURIDAD CORREGIDO ---
  if (user.hotelId) {
      // 1. Si el usuario tiene contexto activo (Hotel seleccionado)
      where.hotelId = user.hotelId;
  } 
  else if (user.rol === ROLES.ROOT || user.rol === ROLES.CORP_VIEWER) {
      // 2. Si es ROOT/Auditor sin contexto, puede filtrar por parámetro opcional
      if (hotelId) where.hotelId = Number(hotelId);
  }
  else if (user.hotels && user.hotels.length > 0) {
      // 3. Si es Admin/Aux MULTI-HOTEL sin contexto:
      // Debe ver solo lo que pertenece a su lista de hoteles permitidos
      const myHotelIds = user.hotels.map(h => h.id);
      
      if (hotelId) {
          // Si intenta filtrar por uno, verificamos que sea suyo
          if (myHotelIds.includes(Number(hotelId))) {
              where.hotelId = Number(hotelId);
          } else {
              // Si pide uno que no es suyo, bloqueamos
              where.hotelId = -1; 
          }
      } else {
          // Si no pide ninguno, ve todos LOS SUYOS
          where.hotelId = { in: myHotelIds };
      }
  } 
  else {
      // 4. Usuario sin permisos ni hoteles
      where.hotelId = -1;
  }
  // -------------------------------------

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