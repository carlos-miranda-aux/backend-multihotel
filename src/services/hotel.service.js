import prisma from "../PrismaClient.js";
import * as auditService from "./audit.service.js";
import { STANDARD_STRUCTURE_TEMPLATE } from "../utils/preloadData.js";
import { ROLES } from "../config/constants.js";

// Filtro especial para la entidad Hotel (filtra por ID, no por hotelId)
const getHotelFilter = (user) => {
    if (!user) return { id: -1 }; 

    if (user.rol === ROLES.ROOT || user.rol === ROLES.CORP_VIEWER) {
        return {};
    }

    if (user.hotels && user.hotels.length > 0) {
        const myHotelIds = user.hotels.map(h => h.id);
        return { id: { in: myHotelIds } };
    }

    return { id: -1 };
};

export const getAllHotels = async (user) => {
  const filter = getHotelFilter(user);

  return prisma.hotel.findMany({
    where: { 
        deletedAt: null,
        ...filter
    },
    select: { 
        id: true, nombre: true, codigo: true, direccion: true, 
        ciudad: true, razonSocial: true, diminutivo: true, 
        activo: true 
    },
    orderBy: { nombre: 'asc' }
  });
};

export const createHotel = async (data, user) => {
  // 1. Crear el Hotel base
  const newHotel = await prisma.hotel.create({
    data: {
      nombre: data.nombre,
      codigo: data.codigo,
      direccion: data.direccion,
      ciudad: data.ciudad,
      razonSocial: data.razonSocial,
      diminutivo: data.diminutivo,
      activo: data.activo !== undefined ? data.activo : true
    }
  });

  // 2. Generar Estructura Automática
  if (data.autoStructure) {
      
      for (const group of STANDARD_STRUCTURE_TEMPLATE) {
          const depto = await prisma.department.upsert({
              where: { 
                  nombre_hotelId: { nombre: group.depto, hotelId: newHotel.id }
              },
              update: {},
              create: { nombre: group.depto, hotelId: newHotel.id }
          });

          if (group.areas && group.areas.length > 0) {
              const uniqueAreas = [...new Set(group.areas)];
              const areasData = uniqueAreas.map(areaName => ({
                  nombre: areaName,
                  departamentoId: depto.id,
                  hotelId: newHotel.id
              }));

              await prisma.area.createMany({
                  data: areasData,
                  skipDuplicates: true 
              });
          }
      }
  }

  await auditService.logActivity({
    action: 'CREATE',
    entity: 'Hotel',
    entityId: newHotel.id,
    newData: newHotel,
    user: user,
    details: `Nuevo Hotel creado: ${newHotel.nombre}`
  });

  return newHotel;
};

export const updateHotel = async (id, data, user) => {
  const hotelId = Number(id);
  
  if (user.rol !== ROLES.ROOT) {
      const hasAccess = user.hotels?.some(h => h.id === hotelId);
      if (!hasAccess) throw new Error("No tienes permiso para editar este hotel.");
  }

  const oldHotel = await prisma.hotel.findUnique({ where: { id: hotelId } });

  const updatedHotel = await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      nombre: data.nombre,
      codigo: data.codigo,
      direccion: data.direccion,
      ciudad: data.ciudad,
      razonSocial: data.razonSocial,
      diminutivo: data.diminutivo,
      activo: data.activo
    }
  });

  await auditService.logActivity({
    action: 'UPDATE',
    entity: 'Hotel',
    entityId: hotelId,
    oldData: oldHotel,
    newData: updatedHotel,
    user: user,
    details: `Hotel actualizado: ${updatedHotel.nombre}`
  });

  return updatedHotel;
};

export const deleteHotel = async (id, user) => {
  if (user.rol !== ROLES.ROOT) {
      throw new Error("Solo el Super Admin (Root) puede eliminar hoteles.");
  }

  const hotelId = Number(id);
  const oldHotel = await prisma.hotel.findUnique({ where: { id: hotelId } });

  const deleted = await prisma.hotel.update({
    where: { id: hotelId },
    data: { deletedAt: new Date(), activo: false }
  });

  await auditService.logActivity({
    action: 'DELETE',
    entity: 'Hotel',
    entityId: hotelId,
    oldData: oldHotel,
    user: user,
    details: `Hotel dado de baja: ${oldHotel.nombre}`
  });

  return deleted;
};