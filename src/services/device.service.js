// src/services/device.service.js
import prisma from "../../src/PrismaClient.js";

// --- getActiveDevices (Paginada) - Sin cambios ---
export const getActiveDevices = async ({ skip, take }) => {
  const whereClause = {
    estado: {
      NOT: {
        nombre: "Baja",
      },
    },
  };

  const [devices, totalCount] = await prisma.$transaction([
    prisma.device.findMany({
      where: whereClause,
      include: {
        usuario: true,
        tipo: true,
        estado: true,
        sistema_operativo: true,
        maintenances: true,
        departamento: true,
      },
      skip: skip,
      take: take,
      orderBy: {
        id: 'desc'
      }
    }),
    prisma.device.count({
      where: whereClause,
    }),
  ]);

  return { devices, totalCount };
};

// 👈 CORRECCIÓN: Nueva función para poblar dropdowns
export const getAllActiveDeviceNames = () =>
  prisma.device.findMany({
    where: {
      estado: {
        NOT: {
          nombre: "Baja",
        },
      },
    },
    select: {
      id: true,
      etiqueta: true,
      nombre_equipo: true,
      tipo: { // Incluir el tipo para el nombre
        select: {
          nombre: true
        }
      }
    },
    orderBy: {
      etiqueta: 'asc'
    }
  });


// --- getInactiveDevices (Paginada) - Sin cambios ---
export const getInactiveDevices = async ({ skip, take }) => {
  const whereClause = {
    estado: {
      nombre: "Baja",
    },
  };
  
  const [devices, totalCount] = await prisma.$transaction([
    prisma.device.findMany({
      where: whereClause,
      include: {
        usuario: true,
        tipo: true,
        estado: true,
        sistema_operativo: true,
        departamento: true,
      },
      skip: skip,
      take: take,
      orderBy: {
        fecha_baja: 'desc'
      }
    }),
    prisma.device.count({
      where: whereClause,
    }),
  ]);
  
  return { devices, totalCount };
};


// --- Resto de funciones (sin cambios) ---
export const getDeviceById = (id) =>
  prisma.device.findUnique({
    where: { id: Number(id) },
    include: {
      usuario: true,
      tipo: true,
      estado: true,
      sistema_operativo: true,
      departamento: true,
    },
  });

export const createDevice = (data) => prisma.device.create({ data });

export const deleteDevice = (id) =>
  prisma.device.delete({
    where: { id: Number(id) },
  });

export const updateDevice = (id, data) =>
  prisma.device.update({
    where: { id: Number(id) },
    data,
  });