import prisma from "../../src/PrismaClient.js";
import * as auditService from "./audit.service.js";

export const getDeviceStatuses = async ({ skip, take, sortBy, order }) => {
  const orderBy = sortBy ? { [sortBy]: order } : { nombre: 'asc' };
  const whereClause = { deletedAt: null };

  const [deviceStatuses, totalCount] = await prisma.$transaction([
    prisma.deviceStatus.findMany({ where: whereClause, skip, take, orderBy }),
    prisma.deviceStatus.count({ where: whereClause })
  ]);
  return { deviceStatuses, totalCount };
};

export const getAllDeviceStatuses = () => prisma.deviceStatus.findMany({ where: { deletedAt: null }, orderBy: { nombre: 'asc' } });
export const getDeviceStatusById = (id) => prisma.deviceStatus.findFirst({ where: { id: Number(id), deletedAt: null } });

export const createDeviceStatus = async (data, user) => {
  const newStatus = await prisma.deviceStatus.create({ data });
  
  await auditService.logActivity({
      action: 'CREATE',
      entity: 'DeviceStatus',
      entityId: newStatus.id,
      newData: newStatus,
      user: user,
      details: `Estado creado: ${newStatus.nombre}`
  });
  return newStatus;
};

export const updateDeviceStatus = async (id, data, user) => {
  const statusId = Number(id);
  const oldStatus = await prisma.deviceStatus.findFirst({ where: { id: statusId } });

  const updatedStatus = await prisma.deviceStatus.update({ where: { id: statusId }, data });

  await auditService.logActivity({
      action: 'UPDATE',
      entity: 'DeviceStatus',
      entityId: statusId,
      oldData: oldStatus,
      newData: updatedStatus,
      user: user,
      details: `Estado actualizado`
  });
  return updatedStatus;
};

export const deleteDeviceStatus = async (id, user) => {
  const statusId = Number(id);
  const oldStatus = await prisma.deviceStatus.findFirst({ where: { id: statusId } });

  const deleted = await prisma.deviceStatus.update({ where: { id: statusId }, data: { deletedAt: new Date() } });

  await auditService.logActivity({
      action: 'DELETE',
      entity: 'DeviceStatus',
      entityId: statusId,
      oldData: oldStatus,
      user: user,
      details: `Estado eliminado`
  });
  return deleted;
};