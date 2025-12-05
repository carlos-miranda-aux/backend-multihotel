// src/services/maintenance.service.js
import prisma from "../../src/PrismaClient.js";
import * as auditService from "./audit.service.js"; 

// Helper de seguridad multi-tenant
const getTenantFilter = (user) => {
  if (!user || !user.hotelId) return {}; 
  return { hotelId: user.hotelId };
};

export const getMaintenances = async ({ skip, take, where, sortBy, order }, user) => {
  const tenantFilter = getTenantFilter(user);
  
  const finalWhere = {
    ...where,
    deletedAt: null,
    ...tenantFilter
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
        // 👇 INCLUIMOS HOTEL
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
      ...tenantFilter
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

export const createMaintenance = async (data, user) => {
  // 1. Buscamos el dispositivo para ver su hotel
  const device = await prisma.device.findUnique({ where: { id: Number(data.deviceId) } });
  if (!device) throw new Error("Dispositivo no encontrado.");

  // 2. Seguridad: Si el usuario tiene hotelId, debe coincidir con el del dispositivo
  // Esto evita que un admin de Cancún programe manto a un equipo de Sensira sabiendo su ID.
  if (user.hotelId && device.hotelId !== user.hotelId) {
      throw new Error("No puedes programar mantenimiento para un equipo que no pertenece a tu hotel.");
  }

  // 3. Crear el mantenimiento HEREDANDO el hotelId del dispositivo
  const newManto = await prisma.maintenance.create({ 
      data: {
          ...data,
          hotelId: device.hotelId // 🛡️ HERENCIA: El mantenimiento pertenece al mismo hotel que el equipo
      } 
  });

  // REGISTRAR AUDITORÍA
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
  
  // Verificamos existencia y permiso
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

  // REGISTRAR AUDITORÍA
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

  // REGISTRAR AUDITORÍA
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