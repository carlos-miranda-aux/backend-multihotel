import prisma from "../PrismaClient.js";
import * as auditService from "./audit.service.js";

export const getAllHotels = async () => {
  return prisma.hotel.findMany({
    where: { deletedAt: null },
    // Se agregan los nuevos campos a la selección
    select: { 
        id: true, nombre: true, codigo: true, direccion: true, 
        ciudad: true, razonSocial: true, diminutivo: true, 
        activo: true 
    },
    orderBy: { nombre: 'asc' }
  });
};

export const createHotel = async (data, user) => {
  const newHotel = await prisma.hotel.create({
    data: {
      nombre: data.nombre,
      codigo: data.codigo,
      direccion: data.direccion,
      ciudad: data.ciudad,
      razonSocial: data.razonSocial, // Nuevo
      diminutivo: data.diminutivo,   // Nuevo
      activo: data.activo !== undefined ? data.activo : true
    }
  });

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
  const oldHotel = await prisma.hotel.findUnique({ where: { id: hotelId } });

  const updatedHotel = await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      nombre: data.nombre,
      codigo: data.codigo,
      direccion: data.direccion,
      ciudad: data.ciudad,
      razonSocial: data.razonSocial, // Nuevo
      diminutivo: data.diminutivo,   // Nuevo
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