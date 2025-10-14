import prisma from "../../src/PrismaClient.js";

export const getUsers = () => prisma.user.findMany({
  include: { departamento: true }
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