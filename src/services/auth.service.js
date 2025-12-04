// src/services/auth.service.js
import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ROLES } from "../config/constants.js";
import * as auditService from "./audit.service.js"; 

const JWT_SECRET = process.env.JWT_SECRET || "supersecreto";

// =====================================================================
// SECCIÓN 1: LÓGICA DE AUTENTICACIÓN Y CRUD
// =====================================================================

export const registerUser = async (data, adminUser) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  // Validamos si se envía hotelId, si no, se asume null (Global/Root) si el admin tiene permisos
  const hotelIdToAssign = data.hotelId ? Number(data.hotelId) : null;

  const newUser = await prisma.userSistema.create({
    data: {
      username: data.username,
      password: hashedPassword,
      nombre: data.nombre,
      rol: data.rol || ROLES.USER,
      email: data.email,
      hotelId: hotelIdToAssign // 👈 Asignación de Hotel
    },
  });

  // 📝 REGISTRAR (El adminUser es quien realizó la acción)
  await auditService.logActivity({
    action: 'CREATE',
    entity: 'UserSistema',
    entityId: newUser.id,
    newData: { ...newUser, password: '[HIDDEN]' },
    user: adminUser,
    details: `Usuario de sistema creado: ${newUser.username} (Hotel ID: ${newUser.hotelId || 'Global'})`
  });

  return newUser;
};

export const loginUser = async ({ identifier, password }) => {
  const user = await prisma.userSistema.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier },
      ],
      deletedAt: null 
    },
    include: { hotel: true } // 👈 Traemos info del hotel para el frontend
  });
  
  if (!user) throw new Error("Usuario no encontrado");
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error("Contraseña incorrecta");

  // 👇 AQUÍ LA MAGIA: Incluimos hotelId en el token
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      rol: user.rol, 
      hotelId: user.hotelId // 🏨 ID del Tenant
    },
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
      email: user.email,
      hotelId: user.hotelId,
      hotelNombre: user.hotel?.nombre || "Global / Corporativo"
    }
  };
};

export const getUsers = async ({ skip, take, sortBy, order }) => {
  const whereClause = { deletedAt: null }; 

  const selectFields = {
    id: true,
    username: true,
    nombre: true,
    rol: true,
    email: true,
    hotelId: true, // 👈 Ver a qué hotel pertenecen
    createdAt: true,
  };

  const orderBy = sortBy ? { [sortBy]: order } : { nombre: 'asc' };

  const [users, totalCount] = await prisma.$transaction([
    prisma.userSistema.findMany({
      where: whereClause,
      select: selectFields,
      skip: skip,
      take: take,
      orderBy: orderBy
    }),
    prisma.userSistema.count({ where: whereClause })
  ]);

  return { users, totalCount };
};

export const getUserById = (id) => {
  return prisma.userSistema.findFirst({ 
    where: {
      id: Number(id),
      deletedAt: null
    },
    select: { id: true, username: true, nombre: true, rol: true, email: true, hotelId: true },
  });
};

export const deleteUser = async (id, adminUser) => {
  const userId = Number(id);
  const oldUser = await prisma.userSistema.findFirst({ where: { id: userId } });

  const deleted = await prisma.userSistema.update({
    where: { id: userId },
    data: { deletedAt: new Date() }
  });

  // 📝 REGISTRAR
  await auditService.logActivity({
    action: 'DELETE',
    entity: 'UserSistema',
    entityId: userId,
    oldData: { ...oldUser, password: '[HIDDEN]' },
    user: adminUser,
    details: `Usuario de sistema eliminado`
  });

  return deleted;
};

export const updateUser = async (id, data, adminUser) => {
  const userId = Number(id);
  const { nombre, email, rol, password, hotelId } = data; // 👈 Recibimos hotelId

  const oldUser = await prisma.userSistema.findFirst({
    where: { id: userId, deletedAt: null }
  });

  if (!oldUser) throw new Error("Usuario no encontrado");

  const updateData = {};
  if (nombre) updateData.nombre = nombre;
  if (email) updateData.email = email;
  if (rol) updateData.rol = rol;
  if (hotelId !== undefined) updateData.hotelId = hotelId ? Number(hotelId) : null;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  if (oldUser.username === "root" && rol && rol !== oldUser.rol) {
    throw new Error("No se puede cambiar el rol del usuario ROOT");
  }
  
  const updatedUser = await prisma.userSistema.update({ where: { id: userId }, data: updateData });

  // 📝 REGISTRAR
  await auditService.logActivity({
    action: 'UPDATE',
    entity: 'UserSistema',
    entityId: userId,
    oldData: { ...oldUser, password: '[HIDDEN]' },
    newData: { ...updatedUser, password: '[HIDDEN]' },
    user: adminUser,
    details: `Actualización de usuario sistema: ${updatedUser.username}`
  });

  return updatedUser;
};