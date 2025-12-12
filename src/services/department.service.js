import prisma from "../../src/PrismaClient.js";
import * as auditService from "./audit.service.js"; 
import { ROLES } from "../config/constants.js"; // 👈 IMPORTANTE

// --- CORRECCIÓN DE SEGURIDAD MULTI-TENANT ---
const getTenantFilter = (user) => {
  if (!user) return { hotelId: -1 };

  if (user.hotelId) {
    return { hotelId: user.hotelId };
  }

  if (user.rol === ROLES.ROOT || user.rol === ROLES.CORP_VIEWER) {
    return {};
  }

  if (user.hotels && user.hotels.length > 0) {
    const allowedIds = user.hotels.map(h => h.id);
    return { hotelId: { in: allowedIds } };
  }

  return { hotelId: -1 };
};
// ----------------------------------------------------

export const getDepartments = async ({ skip, take, sortBy, order }, user) => {
  let orderBy = { nombre: 'asc' };
  if (sortBy) {
      if (sortBy.includes('.')) {
          const parts = sortBy.split('.');
          if (parts.length === 2) orderBy = { [parts[0]]: { [parts[1]]: order } };
      } else {
          orderBy = { [sortBy]: order };
      }
  }

  const tenantFilter = getTenantFilter(user);
  const whereClause = { deletedAt: null, ...tenantFilter }; // 👈 Filtro aplicado

  const [departments, totalCount] = await prisma.$transaction([
    prisma.department.findMany({
      where: whereClause,
      include: { 
          hotel: { select: { nombre: true, codigo: true } } 
      },
      skip: skip,
      take: take,
      orderBy: orderBy
    }),
    prisma.department.count({ where: whereClause })
  ]);
  return { departments, totalCount };
};

export const getAllDepartments = (user) => {
    const tenantFilter = getTenantFilter(user);
    return prisma.department.findMany({
        where: { deletedAt: null, ...tenantFilter },
        orderBy: { nombre: 'asc' }
    });
};

export const getDepartmentById = (id, user) => {
  const tenantFilter = getTenantFilter(user);
  return prisma.department.findFirst({
    where: { 
        id: Number(id), 
        deletedAt: null, 
        ...tenantFilter
    },
  });
};

export const createDepartment = async (data, user) => {
  let hotelIdToAssign = user.hotelId;
  
  if (!hotelIdToAssign && data.hotelId) hotelIdToAssign = Number(data.hotelId);
  
  // Validación extra: Si el usuario no es ROOT, solo puede crear en sus hoteles permitidos
  if (user.rol !== ROLES.ROOT && user.hotels) {
      const canCreate = user.hotels.some(h => h.id === hotelIdToAssign);
      if (!canCreate) throw new Error("No tienes permiso para crear departamentos en este hotel.");
  }

  if (!hotelIdToAssign) throw new Error("No se puede crear un departamento sin asignar un Hotel.");

  const newDept = await prisma.department.create({ 
      data: {
          nombre: data.nombre,
          hotelId: hotelIdToAssign
      }
  });

  await auditService.logActivity({
      action: 'CREATE',
      entity: 'Department',
      entityId: newDept.id,
      newData: newDept,
      user: user,
      details: `Departamento creado: ${newDept.nombre}`
  });

  return newDept;
};

export const updateDepartment = async (id, data, user) => {
  const deptId = Number(id);
  const tenantFilter = getTenantFilter(user);

  const oldDept = await prisma.department.findFirst({ 
      where: { id: deptId, ...tenantFilter } 
  });
  
  if (!oldDept) throw new Error("Departamento no encontrado o sin permisos.");

  const updatedDept = await prisma.department.update({
    where: { id: deptId },
    data: { nombre: data.nombre },
  });

  await auditService.logActivity({
      action: 'UPDATE',
      entity: 'Department',
      entityId: deptId,
      oldData: oldDept,
      newData: updatedDept,
      user: user,
      details: `Departamento actualizado`
  });

  return updatedDept;
};

export const deleteDepartment = async (id, user) => {
  const deptId = Number(id);
  const tenantFilter = getTenantFilter(user);

  const oldDept = await prisma.department.findFirst({ where: { id: deptId, ...tenantFilter } });
  if (!oldDept) throw new Error("Departamento no encontrado o sin permisos.");

  const deleted = await prisma.department.update({
    where: { id: deptId },
    data: { deletedAt: new Date() }
  });

  await auditService.logActivity({
      action: 'DELETE',
      entity: 'Department',
      entityId: deptId,
      oldData: oldDept,
      user: user,
      details: `Departamento eliminado`
  });

  return deleted;
};