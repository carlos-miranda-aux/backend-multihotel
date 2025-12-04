import prisma from "../../src/PrismaClient.js";
import * as auditService from "./audit.service.js"; 

const getTenantFilter = (user) => {
  if (!user || !user.hotelId) return {}; 
  return { hotelId: user.hotelId };
};

export const getAreas = async ({ skip, take, sortBy, order }, user) => {
  let orderBy = { nombre: 'asc' };
  const tenantFilter = getTenantFilter(user);
  
  if (sortBy) {
      if (sortBy.includes('.')) {
          const [relation, field] = sortBy.split('.');
          orderBy = { [relation]: { [field]: order } };
      } else {
          orderBy = { [sortBy]: order };
      }
  }

  const whereClause = { 
      deletedAt: null,
      ...tenantFilter
  };

  const [areas, totalCount] = await prisma.$transaction([
    prisma.area.findMany({
      where: whereClause,
      include: { departamento: true },
      skip: skip,
      take: take,
      orderBy: orderBy
    }),
    prisma.area.count({ where: whereClause })
  ]);

  return { areas, totalCount };
};

export const getAllAreas = (user) => {
  const tenantFilter = getTenantFilter(user);
  return prisma.area.findMany({
    where: { deletedAt: null, ...tenantFilter },
    include: { departamento: true },
    orderBy: [ { departamento: { nombre: 'asc' } }, { nombre: 'asc' } ]
  });
};

export const getAreaById = (id, user) => {
    const tenantFilter = getTenantFilter(user);
    return prisma.area.findFirst({
        where: { id: Number(id), deletedAt: null, ...tenantFilter },
        include: { departamento: true },
    });
};

export const createArea = async (data, user) => {
    // 🛡️ ASIGNACIÓN AUTOMÁTICA
    let hotelIdToAssign = user.hotelId;
    if (!hotelIdToAssign && data.hotelId) hotelIdToAssign = Number(data.hotelId);
    if (!hotelIdToAssign) throw new Error("Se requiere un Hotel para crear el área.");

    // Validar que el departamento pertenezca al mismo hotel
    const dept = await prisma.department.findFirst({ 
        where: { id: Number(data.departamentoId), hotelId: hotelIdToAssign }
    });
    if (!dept) throw new Error("El departamento seleccionado no existe o no pertenece a tu hotel.");

    const newArea = await prisma.area.create({
      data: {
        nombre: data.nombre,
        departamentoId: Number(data.departamentoId),
        hotelId: hotelIdToAssign
      }
    });

    await auditService.logActivity({
        action: 'CREATE',
        entity: 'Area',
        entityId: newArea.id,
        newData: newArea,
        user: user,
        details: `Área creada: ${newArea.nombre}`
    });

    return newArea;
};

export const updateArea = async (id, data, user) => {
    const areaId = Number(id);
    const tenantFilter = getTenantFilter(user);

    const oldArea = await prisma.area.findFirst({ where: { id: areaId, ...tenantFilter } });
    if (!oldArea) throw new Error("Área no encontrada o sin permisos.");

    // Si cambia de departamento, validar que el nuevo depto sea del mismo hotel
    if (data.departamentoId) {
        const dept = await prisma.department.findFirst({ 
            where: { id: Number(data.departamentoId), hotelId: oldArea.hotelId }
        });
        if (!dept) throw new Error("El departamento destino no es válido.");
    }

    const updatedArea = await prisma.area.update({
      where: { id: areaId },
      data: {
        nombre: data.nombre,
        departamentoId: data.departamentoId ? Number(data.departamentoId) : undefined
      },
    });

    await auditService.logActivity({
        action: 'UPDATE',
        entity: 'Area',
        entityId: areaId,
        oldData: oldArea,
        newData: updatedArea,
        user: user,
        details: `Área actualizada: ${updatedArea.nombre}`
    });

    return updatedArea;
};

export const deleteArea = async (id, user) => {
    const areaId = Number(id);
    const tenantFilter = getTenantFilter(user);

    const oldArea = await prisma.area.findFirst({ where: { id: areaId, ...tenantFilter } });
    if (!oldArea) throw new Error("Área no encontrada o sin permisos.");

    const deleted = await prisma.area.update({ 
        where: { id: areaId },
        data: { deletedAt: new Date() }
    });

    await auditService.logActivity({
        action: 'DELETE',
        entity: 'Area',
        entityId: areaId,
        oldData: oldArea,
        user: user,
        details: `Área eliminada`
    });

    return deleted;
};