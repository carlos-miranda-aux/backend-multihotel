// src/services/auth.service.js
import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ROLES } from "../config/constants.js";
import * as auditService from "./audit.service.js"; 

const JWT_SECRET = process.env.JWT_SECRET || "supersecreto";

// Helper de seguridad (Filtro por tenant para LISTAR usuarios)
const getTenantFilter = (user) => {
  if (!user || !user.hotels || user.hotels.length === 0) return {}; // Root/Global ve todo
  // Si tiene hoteles asignados, filtramos los usuarios que pertenezcan a ALGUNO de esos hoteles
  const userHotelIds = user.hotels.map(h => h.id);
  return { hotels: { some: { id: { in: userHotelIds } } } };
};

export const registerUser = async (data, adminUser) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  // 🛡️ Lógica para vincular Hoteles
  // Esperamos que data.hotelIds sea un array, ej: [1, 2]
  let hotelsToConnect = [];

  if (data.hotelIds && Array.isArray(data.hotelIds) && data.hotelIds.length > 0) {
      hotelsToConnect = data.hotelIds.map(id => ({ id: Number(id) }));
  } 
  // Si no envía hoteles y no es ROOT, podríamos asignar el hotel del admin (si tuviera solo uno)
  // Pero para simplicidad, asumimos que el frontend envía los IDs.

  const newUser = await prisma.userSistema.create({
    data: {
      username: data.username,
      password: hashedPassword,
      nombre: data.nombre,
      rol: data.rol || ROLES.HOTEL_GUEST,
      email: data.email,
      // 🔥 CONEXIÓN MUCHOS A MUCHOS
      hotels: {
          connect: hotelsToConnect
      }
    },
    include: { hotels: true } // Para devolverlo con sus hoteles
  });

  await auditService.logActivity({
    action: 'CREATE',
    entity: 'UserSistema',
    entityId: newUser.id,
    newData: { ...newUser, password: '[HIDDEN]' },
    user: adminUser,
    details: `Usuario creado con acceso a ${newUser.hotels.length} hoteles.`
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
    // 🔥 INCLUIMOS LA LISTA DE HOTELES
    include: { hotels: true } 
  });
  
  if (!user) throw new Error("Usuario no encontrado");
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error("Contraseña incorrecta");
  
  // Token payload: Incluimos el array de hoteles
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      rol: user.rol, 
      hotels: user.hotels // Array completo [{id:1, nombre:...}, ...]
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
        hotels: user.hotels 
    }
  };
};

export const getUsers = async ({ skip, take, sortBy, order }, adminUser) => {
  // Ajuste temporal: Root ve todo. Admin local ve usuarios en sus mismos hoteles.
  const whereClause = { deletedAt: null }; 
  
  // Si no es ROOT, filtramos (lógica simplificada para este ejemplo)
  if (adminUser.rol !== ROLES.ROOT && adminUser.hotels && adminUser.hotels.length > 0) {
      const myHotelIds = adminUser.hotels.map(h => h.id);
      whereClause.hotels = { some: { id: { in: myHotelIds } } };
  }

  const orderBy = sortBy ? { [sortBy]: order } : { nombre: 'asc' };

  const [users, totalCount] = await prisma.$transaction([
    prisma.userSistema.findMany({
      where: whereClause,
      // Incluimos hoteles para mostrarlos en la tabla
      include: { hotels: true },
      skip: skip,
      take: take,
      orderBy: orderBy
    }),
    prisma.userSistema.count({ where: whereClause })
  ]);

  return { users, totalCount };
};

export const getUserById = (id, adminUser) => {
  return prisma.userSistema.findFirst({ 
    where: {
      id: Number(id),
      deletedAt: null,
    },
    include: { hotels: true }, // Importante para la edición
  });
};

export const deleteUser = async (id, adminUser) => {
  const userId = Number(id);
  const oldUser = await prisma.userSistema.findUnique({ where: { id: userId } });
  if (!oldUser) throw new Error("Usuario no encontrado.");

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
    details: `Usuario eliminado`
  });

  return deleted;
};

export const updateUser = async (id, data, adminUser) => {
  const userId = Number(id);
  const { nombre, email, rol, password, hotelIds } = data;

  const oldUser = await prisma.userSistema.findUnique({
    where: { id: userId },
    include: { hotels: true }
  });

  if (!oldUser) throw new Error("Usuario no encontrado.");

  const updateData = {};
  if (nombre) updateData.nombre = nombre;
  if (email) updateData.email = email;
  if (rol) updateData.rol = rol;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  // 🔥 ACTUALIZAR HOTELES (Reemplazo completo)
  if (hotelIds && Array.isArray(hotelIds)) {
      updateData.hotels = {
          set: hotelIds.map(id => ({ id: Number(id) }))
      };
  }

  if (oldUser.username === "root" && rol && rol !== oldUser.rol) {
    throw new Error("No se puede cambiar el rol del superadministrador");
  }
  
  const updatedUser = await prisma.userSistema.update({ 
      where: { id: userId }, 
      data: updateData,
      include: { hotels: true }
  });

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