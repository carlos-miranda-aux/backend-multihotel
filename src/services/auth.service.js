import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ROLES } from "../config/constants.js";
import * as auditService from "./audit.service.js"; 

const JWT_SECRET = process.env.JWT_SECRET;

// --- FUNCIÓN DE VALIDACIÓN DE REGLAS DE NEGOCIO ---
const validateRoleAndHotels = (rol, hotelIds) => {
  const isGlobalRole = [ROLES.ROOT, ROLES.CORP_VIEWER].includes(rol);
  const hasHotels = hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0;

  // Regla 1: Globales NO pueden tener hoteles específicos (ven todo o nada, según la lógica de tenant)
  // Nota: En tu sistema, ROOT ve todo por defecto. Asignarle hoteles específicos es redundante y confuso.
  if (isGlobalRole && hasHotels) {
      throw new Error("Los usuarios Globales (Root/Auditor) NO deben tener hoteles asignados. Su acceso es global por defecto.");
  }

  // Regla 2: Locales DEBEN tener al menos un hotel
  if (!isGlobalRole && !hasHotels) {
      throw new Error("Los usuarios Locales (Admin/Aux/Invitado) deben tener al menos un hotel asignado.");
  }
};

export const registerUser = async (data, adminUser) => {
  // 1. Validar consistencia Rol vs Hoteles
  const assignedRol = data.rol || ROLES.HOTEL_GUEST;
  validateRoleAndHotels(assignedRol, data.hotelIds);

  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  let hotelsToConnect = [];
  if (data.hotelIds && Array.isArray(data.hotelIds) && data.hotelIds.length > 0) {
      hotelsToConnect = data.hotelIds.map(id => ({ id: Number(id) }));
  } 

  const newUser = await prisma.userSistema.create({
    data: {
      username: data.username,
      password: hashedPassword,
      nombre: data.nombre,
      rol: assignedRol,
      email: data.email,
      hotels: {
          connect: hotelsToConnect
      }
    },
    include: { hotels: true } 
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
    include: { hotels: true } 
  });
  
  if (!user) throw new Error("Usuario no encontrado");
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error("Contraseña incorrecta");

  const allowedHotelIds = user.hotels.map(h => h.id);

  await auditService.logActivity({
      action: 'LOGIN',
      entity: 'Auth',
      entityId: user.id,
      user: user, 
      details: `Inicio de sesión exitoso. Rol: ${user.rol}`
  });

  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      rol: user.rol, 
      hotels: user.hotels,
      allowedHotels: allowedHotelIds
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
  const whereClause = { deletedAt: null }; 
  
  // Filtro de seguridad para ver usuarios
  if (adminUser.hotelId) {
      whereClause.hotels = { some: { id: adminUser.hotelId } };
  } 
  else if (adminUser.rol !== ROLES.ROOT && adminUser.rol !== ROLES.CORP_VIEWER && adminUser.hotels && adminUser.hotels.length > 0) {
      const myHotelIds = adminUser.hotels.map(h => h.id);
      whereClause.hotels = { some: { id: { in: myHotelIds } } };
  }

  const orderBy = sortBy ? { [sortBy]: order } : { nombre: 'asc' };

  const [users, totalCount] = await prisma.$transaction([
    prisma.userSistema.findMany({
      where: whereClause,
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
    include: { hotels: true },
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

  // --- VALIDACIÓN AL ACTUALIZAR ---
  // Determinamos cuál será el rol final y los hoteles finales para validar
  const targetRole = rol || oldUser.rol;
  
  // Si nos envían hotelIds, usamos esos. Si no, usamos los que ya tenía el usuario.
  let targetHotelIds = [];
  if (hotelIds !== undefined) {
      targetHotelIds = hotelIds; // Puede ser un array vacío si se están quitando todos
  } else {
      targetHotelIds = oldUser.hotels.map(h => h.id);
  }

  // Validar reglas antes de intentar actualizar
  validateRoleAndHotels(targetRole, targetHotelIds);
  // --------------------------------

  const updateData = {};
  if (nombre) updateData.nombre = nombre;
  if (email) updateData.email = email;
  if (rol) updateData.rol = rol;
  if (password) updateData.password = await bcrypt.hash(password, 10);

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