// src/services/auth.service.js
import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";
import { ROLES } from "../config/constants.js"; // 👈 CONSTANTE

const JWT_SECRET = process.env.JWT_SECRET || "supersecreto";

// =====================================================================
// SECCIÓN 1: LÓGICA DE AUTENTICACIÓN Y CRUD
// =====================================================================

export const registerUser = async (data) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return prisma.userSistema.create({
    data: {
      username: data.username,
      password: hashedPassword,
      nombre: data.nombre,
      rol: data.rol || ROLES.USER, // 👈 USO DE CONSTANTE
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
    user: { id: user.id, username: user.username, rol: user.rol, nombre: user.nombre, email: user.email } 
  };
};

export const getUsers = async ({ skip, take, sortBy, order }) => {
  const selectFields = {
    id: true,
    username: true,
    nombre: true,
    rol: true,
    email: true,
    createdAt: true,
  };

  const orderBy = sortBy ? { [sortBy]: order } : { nombre: 'asc' };

  const [users, totalCount] = await prisma.$transaction([
    prisma.userSistema.findMany({
      select: selectFields,
      skip: skip,
      take: take,
      orderBy: orderBy
    }),
    prisma.userSistema.count()
  ]);

  return { users, totalCount };
};

export const getUserById = (id) => {
  return prisma.userSistema.findUnique({
    where: { id: Number(id) },
    select: { id: true, username: true, nombre: true, rol: true, email: true },
  });
};

export const deleteUser = (id) => {
  return prisma.userSistema.delete({ where: { id: Number(id) } });
};

export const updateUser = async (id, data) => {
  const { nombre, email, rol, password } = data;
  const updateData = {};
  if (nombre) updateData.nombre = nombre;
  if (email) updateData.email = email;
  if (rol) updateData.rol = rol;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  const userToUpdate = await prisma.userSistema.findUnique({ where: { id: Number(id) } });
  if (userToUpdate.username === "superadmin" && rol && rol !== userToUpdate.rol) {
    throw new Error("No se puede cambiar el rol del superadministrador");
  }
  return prisma.userSistema.update({ where: { id: Number(id) }, data: updateData });
};

// =====================================================================
// SECCIÓN 2: LÓGICA DE IMPORTACIÓN DE USUARIOS
// =====================================================================

// Limpieza de strings
const clean = (txt) => txt ? txt.toString().trim() : "";
const cleanLower = (txt) => clean(txt).toLowerCase();

// Extrae datos crudos de la fila
const extractRowData = (row, headerMap) => {
    const getVal = (key) => {
        const colIdx = headerMap[key];
        return colIdx ? row.getCell(colIdx).text?.trim() : null;
    };

    const nombreRaw = getVal('nombre');
    const correo = getVal('correo') || getVal('email');
    const areaNombre = getVal('área') || getVal('area'); 
    const deptoNombre = getVal('departamento') || getVal('depto');
    const usuario_login = getVal('usuario de login') || getVal('usuario') || getVal('login');
    const esJefeRaw = getVal('es jefe') || getVal('jefe') || getVal('es jefe de area');

    const es_jefe_de_area = ["si", "yes", "verdadero", "true"].includes(cleanLower(esJefeRaw));

    return {
        nombre: nombreRaw,
        correo: correo || null,
        areaNombre,
        deptoNombre,
        usuario_login: usuario_login || null,
        es_jefe_de_area
    };
};

const resolveArea = (data, context) => {
    let areaId = null;
    if (data.areaNombre && data.deptoNombre) {
      const key = `${cleanLower(data.areaNombre)}|${cleanLower(data.deptoNombre)}`;
      areaId = context.areaMap.get(key);
      
      if (!areaId) {
         const areasFound = context.areasList.filter(a => cleanLower(a.nombre) === cleanLower(data.areaNombre));
         if (areasFound.length === 1) areaId = areasFound[0].id;
      }
    }
    return areaId;
};

export const importUsersFromExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);

  const usersToCreate = [];
  const errors = [];

  const areas = await prisma.area.findMany({
    include: { departamento: true }
  });

  const context = {
      areaMap: new Map(areas.map(a => [`${cleanLower(a.nombre)}|${cleanLower(a.departamento?.nombre)}`, a.id])),
      areasList: areas
  };

  const headerMap = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
      headerMap[cleanLower(cell.value)] = colNumber;
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; 

    const rowData = extractRowData(row, headerMap);
    const areaId = resolveArea(rowData, context);

    const nombreFinal = rowData.nombre || `Usuario Sin Nombre Fila ${rowNumber}`;

    usersToCreate.push({
      nombre: nombreFinal,
      correo: rowData.correo,
      areaId,
      usuario_login: rowData.usuario_login,
      es_jefe_de_area: rowData.es_jefe_de_area
    });
  });

  let successCount = 0;
  
  for (const u of usersToCreate) {
    try {
      const existing = await prisma.user.findFirst({ where: { nombre: u.nombre } });
      
      if (!existing) {
          await prisma.user.create({ data: u });
      } else {
          await prisma.user.update({
              where: { id: existing.id },
              data: u
          });
      }
      successCount++;
    } catch (error) {
      errors.push(`Error BD en fila '${u.nombre}': ${error.message}`);
    }
  }

  return { successCount, errors };
};