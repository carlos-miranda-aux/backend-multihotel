// src/services/auth.service.js
import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ROLES } from "../config/constants.js";
import * as auditService from "./audit.service.js"; 

const JWT_SECRET = process.env.JWT_SECRET || "supersecreto";

// Helper de seguridad
const getTenantFilter = (user) => {
  if (!user || !user.hotelId) return {}; // Root ve todo
  return { hotelId: user.hotelId }; // Admin local solo ve su hotel
};

export const registerUser = async (data, adminUser) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  // 🛡️ LÓGICA DE ASIGNACIÓN DE HOTEL
  let hotelIdToAssign = adminUser.hotelId; // Por defecto, el del creador
  
  // Si es ROOT (sin hotel), usamos el que venga en el body
  if (!hotelIdToAssign && data.hotelId) {
      hotelIdToAssign = Number(data.hotelId);
  }
  
  // Nota: Si Root crea otro Root, hotelIdToAssign será null, lo cual es correcto.
  // Pero si un Admin Local intenta crear usuario, hotelIdToAssign será su hotel.

  const newUser = await prisma.userSistema.create({
    data: {
      username: data.username,
      password: hashedPassword,
      nombre: data.nombre,
      rol: data.rol || ROLES.HOTEL_GUEST,
      email: data.email,
      hotelId: hotelIdToAssign // 👈 AQUÍ ESTÁ LA CLAVE
    },
  });

  await auditService.logActivity({
    action: 'CREATE',
    entity: 'UserSistema',
    entityId: newUser.id,
    newData: { ...newUser, password: '[HIDDEN]' },
    user: adminUser,
    details: `Usuario de sistema creado: ${newUser.username} (Hotel: ${newUser.hotelId || 'Global'})`
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
    include: { hotel: true }
  });
  if (!user) throw new Error("Usuario no encontrado");
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error("Contraseña incorrecta");
  
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      rol: user.rol, 
      hotelId: user.hotelId // 👈 Importante para el frontend
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
        hotelId: user.hotelId 
    }
  };
};

export const getUsers = async ({ skip, take, sortBy, order }, adminUser) => {
  const tenantFilter = getTenantFilter(adminUser); // 🛡️ Filtro
  
  const whereClause = { 
      deletedAt: null,
      ...tenantFilter 
  }; 

  const selectFields = {
    id: true,
    username: true,
    nombre: true,
    rol: true,
    email: true,
    hotelId: true,
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

export const getUserById = (id, adminUser) => {
  const tenantFilter = getTenantFilter(adminUser);
  return prisma.userSistema.findFirst({ 
    where: {
      id: Number(id),
      deletedAt: null,
      ...tenantFilter // 🛡️ Filtro
    },
    select: { id: true, username: true, nombre: true, rol: true, email: true, hotelId: true },
  });
};

export const deleteUser = async (id, adminUser) => {
  const userId = Number(id);
  const tenantFilter = getTenantFilter(adminUser);

  const oldUser = await prisma.userSistema.findFirst({ where: { id: userId, ...tenantFilter } });
  if (!oldUser) throw new Error("Usuario no encontrado o sin permisos.");

  const deleted = await prisma.userSistema.update({
    where: { id: userId },
    data: { deletedAt: new Date() }
  });

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
  const { nombre, email, rol, password, hotelId } = data;
  const tenantFilter = getTenantFilter(adminUser);

  const oldUser = await prisma.userSistema.findFirst({
    where: { id: userId, deletedAt: null, ...tenantFilter }
  });

  if (!oldUser) throw new Error("Usuario no encontrado o sin permisos.");

  const updateData = {};
  if (nombre) updateData.nombre = nombre;
  if (email) updateData.email = email;
  if (rol) updateData.rol = rol;
  
  // Solo permitimos cambiar el hotel si eres Root (adminUser.hotelId es null)
  // Si eres Admin Local, ignoramos cualquier intento de cambiar hotelId
  if (!adminUser.hotelId && hotelId !== undefined) {
      updateData.hotelId = hotelId ? Number(hotelId) : null;
  }

  if (password) updateData.password = await bcrypt.hash(password, 10);

  if (oldUser.username === "root" && rol && rol !== oldUser.rol) {
    throw new Error("No se puede cambiar el rol del superadministrador");
  }
  
  const updatedUser = await prisma.userSistema.update({ where: { id: userId }, data: updateData });

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