// services/disposal.service.js
import prisma from "../../src/PrismaClient.js";

// Obtener todas las bajas
export const getDisposals = () =>
  prisma.disposal.findMany({
    include: {
      device: {
        include: {
          tipo: true,              // ✅ Relación con DeviceType
          estado: true,            // ✅ Relación con DeviceStatus
          sistema_operativo: true, // ✅ Relación con OperatingSystem
          usuario: true,           // ✅ Relación con Usuario
        },
      },
    },
  });

// Obtener una baja por id
export const getDisposal = (id) =>
  prisma.disposal.findUnique({
    where: { id: Number(id) },
    include: {
      device: {
        include: {
          tipo: true,
          estado: true,
          sistema_operativo: true,
          usuario: true,
        },
      },
    },
  });


// Actualizar baja (solo observaciones, motivo o fecha)
export const updateDisposal = (id, data) => {
  return prisma.disposal.update({
    where: { id: Number(id) },
    data: {
      motivo: data.motivo,
      observaciones: data.observaciones,
      fecha_baja: data.fecha_baja,
    },
  });
};

// Eliminar baja (no recomendado, pero disponible)
export const deleteDisposal = (id) =>
  prisma.disposal.delete({
    where: { id: Number(id) },
  });
