import prisma from "../../src/PrismaClient.js";
import * as auditService from "./audit.service.js"; // 👈 IMPORTAR

export const getDeviceTypes = async ({ skip, take, sortBy, order }) => {
  const orderBy = sortBy ? { [sortBy]: order } : { nombre: 'asc' };
  const whereClause = { deletedAt: null };

  const [deviceTypes, totalCount] = await prisma.$transaction([
    prisma.deviceType.findMany({ where: whereClause, skip, take, orderBy }),
    prisma.deviceType.count({ where: whereClause })
  ]);
  return { deviceTypes, totalCount };
};

export const getAllDeviceTypes = () => prisma.deviceType.findMany({ where: { deletedAt: null }, orderBy: { nombre: 'asc' } });
export const getDeviceTypeById = (id) => prisma.deviceType.findFirst({ where: { id: Number(id), deletedAt: null } });

export const createDeviceType = async (data, user) => {
  const newType = await prisma.deviceType.create({ data });
  
  await auditService.logActivity({
      action: 'CREATE',
      entity: 'DeviceType',
      entityId: newType.id,
      newData: newType,
      user: user,
      details: `Tipo de equipo creado: ${newType.nombre}`
  });
  return newType;
};

export const updateDeviceType = async (id, data, user) => {
  const typeId = Number(id);
  const oldType = await prisma.deviceType.findFirst({ where: { id: typeId } });
  
  const updatedType = await prisma.deviceType.update({ where: { id: typeId }, data });

  await auditService.logActivity({
      action: 'UPDATE',
      entity: 'DeviceType',
      entityId: typeId,
      oldData: oldType,
      newData: updatedType,
      user: user,
      details: `Tipo actualizado`
  });
  return updatedType;
};

export const deleteDeviceType = async (id, user) => {
  const typeId = Number(id);
  const oldType = await prisma.deviceType.findFirst({ where: { id: typeId } });

  const deleted = await prisma.deviceType.update({ where: { id: typeId }, data: { deletedAt: new Date() } });

  await auditService.logActivity({
      action: 'DELETE',
      entity: 'DeviceType',
      entityId: typeId,
      oldData: oldType,
      user: user,
      details: `Tipo eliminado`
  });
  return deleted;
};