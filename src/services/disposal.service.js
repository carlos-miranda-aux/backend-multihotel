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

// Crear una baja
export const createDisposal = async (data) => {
  // Verificar si ya está de baja
  const existing = await prisma.disposal.findFirst({
    where: { deviceId: data.deviceId },
  });

  if (existing) {
    throw new Error("Este dispositivo ya fue dado de baja y no puede reactivarse.");
  }

  // Crear registro de baja
  const disposal = await prisma.disposal.create({ data });

  // Buscar el estado "Baja"
  const estadoBaja = await prisma.deviceStatus.findFirst({
    where: { nombre: "Baja" }, // ⚠️ ajusta al nombre exacto en tu tabla
  });

  if (!estadoBaja) {
    throw new Error('No existe un estado llamado "Baja" en device_status');
  }

  // Marcar el equipo como "de baja"
  await prisma.device.update({
    where: { id: data.deviceId },
    data: { estadoId: estadoBaja.id },
  });

  return disposal;
};

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
