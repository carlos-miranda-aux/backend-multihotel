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

// 🔹 Login (acepta username o email)
export const loginUser = async ({ identifier, password }) => {
  // Buscar usuario por username o email
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

  // 🔹 Devuelve toda la info necesaria para el frontend y contexto
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

// 🔹 Obtener todos los usuarios
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


// 🔹 Actualizar usuario (nombre, email, rol y/o contraseña)
export const updateUser = async (id, data) => {
  const { nombre, email, rol, password } = data;
  const updateData = {};

  if (nombre) updateData.nombre = nombre;
  if (email) updateData.email = email;
  if (rol) updateData.rol = rol;

  // Si se proporciona una nueva contraseña, la encriptamos
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  // Verificar que no se intente cambiar el rol del superadministrador
  const userToUpdate = await prisma.userSistema.findUnique({ where: { id: Number(id) } });
  if (userToUpdate.username === "superadmin" && rol && rol !== userToUpdate.rol) {
    throw new Error("No se puede cambiar el rol del superadministrador");
  }

  return prisma.userSistema.update({
    where: { id: Number(id) },
    data: updateData,
  });
};
