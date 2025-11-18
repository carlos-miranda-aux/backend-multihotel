// services/auth.service.js
import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecreto";

// ... (registerUser, loginUser - sin cambios) ...
export const registerUser = async (data) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.userSistema.create({
    data: {
      username: data.username,
      password: hashedPassword,
      nombre: data.nombre,
      rol: data.rol || "USER",
      email: data.email,
    },
  });
};

export const loginUser = async ({ identifier, password }) => {
  const user = await prisma.userSistema.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier },
      ],
    },
  });

  if (!user) throw new Error("Usuario no encontrado");

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error("Contraseña incorrecta");

  const token = jwt.sign(
    { id: user.id, username: user.username, rol: user.rol },
    JWT_SECRET,
    { expiresIn: "60d" }
  );

  return { 
    token, 
    user: { 
      id: user.id,
      username: user.username,
      rol: user.rol,
      nombre: user.nombre,
      email: user.email
    } 
  };
};

// 👈 CORRECCIÓN: 'getUsers' ahora acepta paginación
export const getUsers = async ({ skip, take }) => {
  const selectFields = {
    id: true,
    username: true,
    nombre: true,
    rol: true,
    email: true,
    createdAt: true,
  };

  const [users, totalCount] = await prisma.$transaction([
    prisma.userSistema.findMany({
      select: selectFields,
      skip: skip,
      take: take,
      orderBy: {
        nombre: 'asc'
      }
    }),
    prisma.userSistema.count()
  ]);

  return { users, totalCount };
};

export const getUserById = (id) => {
  return prisma.userSistema.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      username: true,
      nombre: true,
      rol: true,
      email: true,
    },
  });
};

export const deleteUser = (id) => {
  return prisma.userSistema.delete({
    where: { id: Number(id) },
  });
};

export const updateUser = async (id, data) => {
  // ... (lógica de updateUser sin cambios)
  const { nombre, email, rol, password } = data;
  const updateData = {};

  if (nombre) updateData.nombre = nombre;
  if (email) updateData.email = email;
  if (rol) updateData.rol = rol;

  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const userToUpdate = await prisma.userSistema.findUnique({ where: { id: Number(id) } });
  if (userToUpdate.username === "superadmin" && rol && rol !== userToUpdate.rol) {
    throw new Error("No se puede cambiar el rol del superadministrador");
  }

  return prisma.userSistema.update({
    where: { id: Number(id) },
    data: updateData,
  });
};