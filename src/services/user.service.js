// src/services/user.service.js
import prisma from "../../src/PrismaClient.js";

export const getUsers = async ({ skip, take, search }) => {
  // 👈 CORRECCIÓN: Filtro de búsqueda
  const whereClause = search ? {
    OR: [
      { nombre: { contains: search } },
      { correo: { contains: search } },
      { usuario_login: { contains: search } }
    ]
  } : {};

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      where: whereClause, // Aplicar filtro
      include: { departamento: true },
      skip: skip,
      take: take,
      orderBy: { nombre: 'asc' }
    }),
    prisma.user.count({ where: whereClause }) // Contar filtrados
  ]);

  return { users, totalCount };
};

// ... (Resto de funciones: getAllUsers, getUserById, etc. SIN CAMBIOS)
export const getAllUsers = () => prisma.user.findMany({
  select: {
    id: true,
    nombre: true
  },
  orderBy: {
    nombre: 'asc'
  }
});

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