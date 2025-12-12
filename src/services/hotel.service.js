import prisma from "../PrismaClient.js";
import * as auditService from "./audit.service.js";
import { STANDARD_STRUCTURE_TEMPLATE } from "../utils/preloadData.js";

export const getAllHotels = async () => {
  return prisma.hotel.findMany({
    where: { deletedAt: null },
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

  // 2. Generar Estructura Automática (Si se solicita)
  if (data.autoStructure) {
      
      for (const group of STANDARD_STRUCTURE_TEMPLATE) {
          // A. Crear el Departamento vinculado al Hotel
          // Usamos upsert por seguridad si por alguna razón extraña ya existiera
          const depto = await prisma.department.upsert({
              where: { 
                  nombre_hotelId: { 
                      nombre: group.depto, 
                      hotelId: newHotel.id 
                  }
              },
              update: {},
              create: {
                  nombre: group.depto,
                  hotelId: newHotel.id
              }
          });

          // B. Crear las Áreas vinculadas
          if (group.areas && group.areas.length > 0) {
              // FILTRO DE SEGURIDAD: Elimina nombres duplicados en el array antes de procesar
              const uniqueAreas = [...new Set(group.areas)];

              const areasData = uniqueAreas.map(areaName => ({
                  nombre: areaName,
                  departamentoId: depto.id,
                  hotelId: newHotel.id
              }));

              // createMany con skipDuplicates evita el error P2002 si algo se repite
              await prisma.area.createMany({
                  data: areasData,
                  skipDuplicates: true 
              });
          }
      }
  }

  // 3. Registrar Auditoría
  await auditService.logActivity({
    action: 'CREATE',
    entity: 'Hotel',
    entityId: newHotel.id,
    newData: newHotel,
    user: user,
    details: `Nuevo Hotel creado: ${newHotel.nombre} ${data.autoStructure ? '(Con estructura base)' : ''}`
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