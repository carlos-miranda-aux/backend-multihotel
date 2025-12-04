// src/services/audit.service.js
import prisma from "../PrismaClient.js";

/**
 * Registra una acción en la bitácora de auditoría.
 */
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
    // Lista blanca de acciones que no requieren ID específico
    const actionsWithoutId = ['LOGIN_FAIL', 'UNAUTHORIZED_ACCESS', 'IMPORT'];
    
    // Si no es una acción general y no tiene ID, ignoramos para no ensuciar logs
    if ((entityId === null || entityId === undefined) && !actionsWithoutId.includes(action)) {
        return;
    }

    // 🛡️ Determinamos el contexto del Hotel para el log
    let hotelIdToLog = null;

    if (user && user.hotelId) {
        // Caso 1: El usuario es local, el log es de su hotel
        hotelIdToLog = user.hotelId;
    } else {
        // Caso 2: El usuario es Global (Root). Intentamos deducir el hotel de los datos.
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
        hotelId: hotelIdToLog ? Number(hotelIdToLog) : null, // 👈 Guardamos dónde ocurrió
        details: details || null,
      }
    });
  } catch (error) {
    console.error("⚠️ Error al registrar auditoría:", error.message);
  }
};

/**
 * Obtiene los logs paginados con lógica Multi-Tenant inteligente
 */
export const getAuditLogs = async ({ skip, take, entity, userId, hotelId }, user) => {
  const where = {};

  // 🛡️ LÓGICA DE SEGURIDAD Y FILTRADO
  if (user.hotelId) {
      // CASO A: Usuario Local (Admin Hotel, Auxiliar)
      // Solo ve logs de SU hotel. Ignoramos cualquier filtro de hotelId que envíe.
      where.hotelId = user.hotelId;
  } else {
      // CASO B: Usuario Global (ROOT, CORP_VIEWER)
      // Si el frontend envía un hotelId específico, filtramos por él.
      // Si no envía nada, ve TODOS los logs (visión corporativa).
      if (hotelId) {
          where.hotelId = Number(hotelId);
      }
  }
  
  // Filtros adicionales (comunes para todos)
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
          select: { username: true, nombre: true, rol: true } // Datos básicos del autor
        },
        // Opcional: Podrías incluir información básica del hotel si es vista global
        // hotel: { select: { nombre: true } } 
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  return { logs, totalCount };
};