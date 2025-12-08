import prisma from "../../src/PrismaClient.js";
import * as auditService from "./audit.service.js";

export const getOperatingSystems = async ({ skip, take, sortBy, order }) => {
  const orderBy = sortBy ? { [sortBy]: order } : { nombre: 'asc' };
  const whereClause = { deletedAt: null };

  const [operatingSystems, totalCount] = await prisma.$transaction([
    prisma.operatingSystem.findMany({ where: whereClause, skip, take, orderBy }),
    prisma.operatingSystem.count({ where: whereClause })
  ]);
  return { operatingSystems, totalCount };
};

export const getAllOperatingSystems = () => prisma.operatingSystem.findMany({ where: { deletedAt: null }, orderBy: { nombre: 'asc' } });
export const getOperatingSystemById = (id) => prisma.operatingSystem.findFirst({ where: { id: Number(id), deletedAt: null } });

export const createOperatingSystem = async (data, user) => {
  const newOS = await prisma.operatingSystem.create({ data });
  
  await auditService.logActivity({
      action: 'CREATE',
      entity: 'OperatingSystem',
      entityId: newOS.id,
      newData: newOS,
      user: user,
      details: `SO creado: ${newOS.nombre}`
  });
  return newOS;
};

export const updateOperatingSystem = async (id, data, user) => {
  const osId = Number(id);
  const oldOS = await prisma.operatingSystem.findFirst({ where: { id: osId } });

  const updatedOS = await prisma.operatingSystem.update({ where: { id: osId }, data });

  await auditService.logActivity({
      action: 'UPDATE',
      entity: 'OperatingSystem',
      entityId: osId,
      oldData: oldOS,
      newData: updatedOS,
      user: user,
      details: `SO actualizado`
  });
  return updatedOS;
};

export const deleteOperatingSystem = async (id, user) => {
  const osId = Number(id);
  const oldOS = await prisma.operatingSystem.findFirst({ where: { id: osId } });

  const deleted = await prisma.operatingSystem.update({ where: { id: osId }, data: { deletedAt: new Date() } });

  await auditService.logActivity({
      action: 'DELETE',
      entity: 'OperatingSystem',
      entityId: osId,
      oldData: oldOS,
      user: user,
      details: `SO eliminado`
  });
  return deleted;
};