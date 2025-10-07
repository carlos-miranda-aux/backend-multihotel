import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecreto";

// 🔹 Registrar usuario
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

// 🔹 Login
export const loginUser = async ({ username, password }) => {
  const user = await prisma.userSistema.findUnique({
    where: { OR: [
        { username: identifier },
        { email: identifier },
      ], },
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
    user: { id: user.id, username: user.username, rol: user.rol } 
  };
};

// 🔹 Obtener todos los usuarios (solo info básica, sin contraseñas)
export const getUsers = () => {
  return prisma.userSistema.findMany({
    select: {
      id: true,
      username: true,
      nombre: true,
      rol: true,
      email: true,
      createdAt: true,
    },
  });
};

// 🔹 Eliminar usuario
export const deleteUser = (id) => {
  return prisma.userSistema.delete({
    where: { id: Number(id) },
  });
};

// 🔹 Actualizar contraseña
export const updatePassword = async (id, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return prisma.userSistema.update({
    where: { id: Number(id) },
    data: { password: hashedPassword },
  });
};
