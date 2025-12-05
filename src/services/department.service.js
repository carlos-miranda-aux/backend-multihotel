import prisma from "../../src/PrismaClient.js";
import * as auditService from "./audit.service.js"; 

// 🛡️ Helper para aislar datos por hotel
const getTenantFilter = (user) => {
  if (!user || !user.hotelId) return {}; 
  return { hotelId: user.hotelId }; 
};

export const getDepartments = async ({ skip, take, sortBy, order }, user) => {
  // Soporte para ordenar por nombre de hotel
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
  const whereClause = { deletedAt: null, ...tenantFilter };

  const [departments, totalCount] = await prisma.$transaction([
    prisma.department.findMany({
      where: whereClause,
      include: { 
          // 👇 INCLUIMOS DATOS DEL HOTEL
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
        ...tenantFilter // Solo si pertenece a mi hotel
    },
  });
};

export const createDepartment = async (data, user) => {
  // 🛡️ ASIGNACIÓN AUTOMÁTICA DE UBICACIÓN
  let hotelIdToAssign = user.hotelId;
  
  // Si es Root, permitimos que elija el hotel, si no, es obligatorio su propio hotel
  if (!hotelIdToAssign && data.hotelId) hotelIdToAssign = Number(data.hotelId);
  
  if (!hotelIdToAssign) throw new Error("No se puede crear un departamento sin asignar un Hotel.");

  const newDept = await prisma.department.create({ 
      data: {
          nombre: data.nombre,
          hotelId: hotelIdToAssign // 👈 Aquí se fija la ubicación
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

  // Verificamos propiedad antes de editar
  const oldDept = await prisma.department.findFirst({ 
      where: { id: deptId, ...tenantFilter } 
  });
  
  if (!oldDept) throw new Error("Departamento no encontrado o sin permisos.");

  const updatedDept = await prisma.department.update({
    where: { id: deptId },
    data: { nombre: data.nombre }, // Solo permitimos cambiar nombre, no hotel
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