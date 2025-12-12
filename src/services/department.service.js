import prisma from "../../src/PrismaClient.js";
import * as auditService from "./audit.service.js"; 
import { ROLES } from "../config/constants.js"; // 👈 IMPORTANTE

// --- CORRECCIÓN DE SEGURIDAD MULTI-TENANT ---
const getTenantFilter = (user) => {
  if (!user) return { hotelId: -1 }; // Bloqueo total si no hay usuario

  // 1. Contexto específico (Hotel seleccionado en el frontend)
  if (user.hotelId) {
    return { hotelId: user.hotelId };
  }

  // 2. Roles Globales (Ven todo)
  if (user.rol === ROLES.ROOT || user.rol === ROLES.CORP_VIEWER) {
    return {};
  }

  // 3. Usuarios con múltiples hoteles (Ven solo sus asignados)
  if (user.hotels && user.hotels.length > 0) {
    const allowedIds = user.hotels.map(h => h.id);
    return { hotelId: { in: allowedIds } };
  }

  // 4. Fallback seguro (No ve nada)
  return { hotelId: -1 };
};
// ----------------------------------------------------

export const getMaintenances = async ({ skip, take, where, sortBy, order }, user) => {
  const tenantFilter = getTenantFilter(user);
  
  const finalWhere = {
    ...where,
    deletedAt: null,
    ...tenantFilter // 👈 Aplicamos el filtro seguro
  };

  let orderBy = { fecha_programada: 'desc' };
  if (sortBy) {
    if (sortBy.includes('.')) {
      const parts = sortBy.split('.');
      if (parts.length === 2) orderBy = { [parts[0]]: { [parts[1]]: order } };
    } else {
      orderBy = { [sortBy]: order };
    }
  }

  const [maintenances, totalCount] = await prisma.$transaction([
    prisma.maintenance.findMany({
      where: finalWhere,
      include: {
        device: {
          select: {
            id: true, etiqueta: true, nombre_equipo: true, numero_serie: true, ip_equipo: true,
            usuario: { select: { nombre: true, usuario_login: true } },
            area: { select: { nombre: true, departamento: { select: { nombre: true } } } }
          }
        },
        hotel: { select: { nombre: true, codigo: true } }
      },
      skip: skip,
      take: take,
      orderBy: orderBy
    }),
    prisma.maintenance.count({ where: finalWhere })
  ]);

  return { maintenances, totalCount };
};

export const getMaintenanceById = (id, user) => {
  const tenantFilter = getTenantFilter(user);
  
  return prisma.maintenance.findFirst({
    where: {
      id: Number(id),
      deletedAt: null,
      ...tenantFilter // 👈 Seguridad aquí también
    },
    include: {
      device: {
        include: {
          usuario: true,
          area: {
            include: {
              departamento: true
            }
          },
          tipo: true,
        },
      },
    },
  });
};

// ... (El resto de funciones create, update, delete se mantienen igual, ya usan las validaciones)
export const createMaintenance = async (data, user) => {
  const device = await prisma.device.findUnique({ where: { id: Number(data.deviceId) } });
  if (!device) throw new Error("Dispositivo no encontrado.");

  // Validación de seguridad cruzada
  if (user.hotelId && device.hotelId !== user.hotelId) {
      throw new Error("No puedes programar mantenimiento para un equipo que no pertenece a tu hotel activo.");
  }
  
  // Validación para vista global limitada
  if (!user.hotelId && user.hotels && user.hotels.length > 0) {
      const hasAccess = user.hotels.some(h => h.id === device.hotelId);
      if (!hasAccess && user.rol !== ROLES.ROOT) {
          throw new Error("No tienes permisos sobre el hotel al que pertenece este equipo.");
      }
  }

  const newManto = await prisma.maintenance.create({ 
      data: {
          ...data,
          hotelId: device.hotelId 
      } 
  });

  await auditService.logActivity({
    action: 'CREATE',
    entity: 'Maintenance',
    entityId: newManto.id,
    newData: newManto,
    user: user,
    details: `Mantenimiento programado para equipo ID: ${newManto.deviceId}`
  });

  return newManto;
};

export const updateMaintenance = async (id, data, user) => {
  const mantoId = Number(id);
  const tenantFilter = getTenantFilter(user);
  
  const oldManto = await prisma.maintenance.findFirst({ where: { id: mantoId, ...tenantFilter } });
  if (!oldManto) throw new Error("Mantenimiento no encontrado o sin permisos.");

  const updatedManto = await prisma.maintenance.update({
    where: { id: mantoId },
    data,
  });

  let details = "Actualización de mantenimiento";
  if (oldManto.estado !== 'realizado' && updatedManto.estado === 'realizado') {
    details = "Mantenimiento COMPLETADO";
  }

  await auditService.logActivity({
    action: 'UPDATE',
    entity: 'Maintenance',
    entityId: mantoId,
    oldData: oldManto,
    newData: updatedManto,
    user: user,
    details: details
  });

  return updatedManto;
};

export const deleteMaintenance = async (id, user) => {
  const mantoId = Number(id);
  const tenantFilter = getTenantFilter(user);

  const oldManto = await prisma.maintenance.findFirst({ where: { id: mantoId, ...tenantFilter } });
  if (!oldManto) throw new Error("Mantenimiento no encontrado o sin permisos.");

  const deleted = await prisma.maintenance.update({
    where: { id: mantoId },
    data: { deletedAt: new Date() }
  });

  await auditService.logActivity({
    action: 'DELETE',
    entity: 'Maintenance',
    entityId: mantoId,
    oldData: oldManto,
    user: user,
    details: "Mantenimiento eliminado"
  });

  return deleted;
};