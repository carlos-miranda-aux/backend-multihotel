// src/services/user.service.js
import prisma from "../../src/PrismaClient.js";

// --- getUsers (Paginada) - Sin cambios ---
export const getUsers = async ({ skip, take }) => {
  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      include: { departamento: true },
      skip: skip,
      take: take,
      orderBy: {
        nombre: 'asc'
      }
    }),
    prisma.user.count()
  ]);

  return { users, totalCount };
};

// 👈 CORRECCIÓN: Nueva función para poblar dropdowns
export const getAllUsers = () => prisma.user.findMany({
  select: {
    id: true,
    nombre: true
  },
  orderBy: {
    nombre: 'asc'
  }
});

// --- Resto de funciones (sin cambios) ---
export const getUserById = (id) => prisma.user.findUnique({
  where: { id: Number(id) },
  include: { departamento: true }
});

export const createUser = (data) => prisma.user.create({
  data,
});

export const updateUser = (id, data) => prisma.user.update({
  where: { id: Number(id) },
  data,
});

export const deleteUser = (id) => prisma.user.delete({
  where: { id: Number(id) },
});