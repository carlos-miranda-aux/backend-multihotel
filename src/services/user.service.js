// src/services/user.service.js
import prisma from "../../src/PrismaClient.js";
import ExcelJS from "exceljs";

// =====================================================================
// SECCIÓN 1: FUNCIONES CRUD ESTÁNDAR (Sin cambios mayores)
// =====================================================================

export const getUsers = async ({ skip, take, search, sortBy, order }) => {
  const whereClause = search ? {
    OR: [
      { nombre: { contains: search } },
      { correo: { contains: search } },
      { usuario_login: { contains: search } }
    ]
  } : {};

  // Construcción dinámica del ordenamiento
  let orderBy = { nombre: 'asc' };
  if (sortBy) {
      if (sortBy.includes('.')) {
          const [relation, field] = sortBy.split('.');
          orderBy = { [relation]: { [field]: order } };
      } else {
          orderBy = { [sortBy]: order };
      }
  }

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      where: whereClause,
      include: { 
        area: { include: { departamento: true } } 
      },
      skip: skip,
      take: take,
      orderBy: orderBy
    }),
    prisma.user.count({ where: whereClause })
  ]);

  return { users, totalCount };
};

export const getAllUsers = () => prisma.user.findMany({
  select: { id: true, nombre: true },
  orderBy: { nombre: 'asc' }
});

export const getUserById = (id) => prisma.user.findUnique({
  where: { id: Number(id) },
  include: { area: { include: { departamento: true } } }
});

export const createUser = (data) => prisma.user.create({
  data: {
      ...data,
      areaId: data.areaId ? Number(data.areaId) : null 
  },
});

export const updateUser = (id, data) => prisma.user.update({
  where: { id: Number(id) },
  data: {
      ...data,
      areaId: data.areaId ? Number(data.areaId) : null
  },
});

export const deleteUser = (id) => prisma.user.delete({
  where: { id: Number(id) },
});

// =====================================================================
// SECCIÓN 2: HELPERS PARA IMPORTACIÓN (Refactorizado)
// =====================================================================

// Limpieza de strings
const clean = (txt) => txt ? txt.toString().trim() : "";
const cleanLower = (txt) => clean(txt).toLowerCase();

// Extrae datos crudos de la fila
const extractRowData = (row, headerMap) => {
    const getVal = (key) => {
        // Busca coincidencias parciales si la key exacta no existe (opcional) o usa keys exactas
        const colIdx = headerMap[key];
        return colIdx ? row.getCell(colIdx).text?.trim() : null;
    };

    // Mapeo flexible de nombres de columna
    const nombreRaw = getVal('nombre');
    const correo = getVal('correo') || getVal('email');
    const areaNombre = getVal('área') || getVal('area'); 
    const deptoNombre = getVal('departamento') || getVal('depto');
    const usuario_login = getVal('usuario de login') || getVal('usuario') || getVal('login');
    const esJefeRaw = getVal('es jefe') || getVal('jefe') || getVal('es jefe de area');

    // Normalizar booleano
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

// Resuelve la relación de Área
const resolveArea = (data, context) => {
    let areaId = null;
    if (data.areaNombre && data.deptoNombre) {
      // 1. Intento exacto: Nombre Área + Nombre Depto
      const key = `${cleanLower(data.areaNombre)}|${cleanLower(data.deptoNombre)}`;
      areaId = context.areaMap.get(key);
      
      // 2. Intento parcial: Solo por nombre de área (si es único en la lista)
      if (!areaId) {
         const areasFound = context.areasList.filter(a => cleanLower(a.nombre) === cleanLower(data.areaNombre));
         if (areasFound.length === 1) areaId = areasFound[0].id;
      }
    }
    return areaId;
};

// =====================================================================
// SECCIÓN 3: FUNCIÓN PRINCIPAL DE IMPORTACIÓN
// =====================================================================

export const importUsersFromExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);

  const usersToCreate = [];
  const errors = [];

  // 1. Cargar Contexto (Áreas existentes)
  const areas = await prisma.area.findMany({
    include: { departamento: true }
  });

  const context = {
      areaMap: new Map(areas.map(a => [`${cleanLower(a.nombre)}|${cleanLower(a.departamento?.nombre)}`, a.id])),
      areasList: areas
  };

  // 2. Mapear Encabezados
  const headerMap = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
      headerMap[cleanLower(cell.value)] = colNumber;
  });

  // 3. Procesar Filas
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; 

    const rowData = extractRowData(row, headerMap);
    const areaId = resolveArea(rowData, context);

    // Validación mínima: Nombre es obligatorio para identificar
    const nombreFinal = rowData.nombre || `Usuario Sin Nombre Fila ${rowNumber}`;

    usersToCreate.push({
      nombre: nombreFinal,
      correo: rowData.correo,
      areaId,
      usuario_login: rowData.usuario_login,
      es_jefe_de_area: rowData.es_jefe_de_area
    });
  });

  // 4. Escritura en BD (Upsert Lógico)
  let successCount = 0;
  
  for (const u of usersToCreate) {
    try {
      // Buscamos si existe por nombre (puedes cambiarlo a correo o login si prefieres que sean únicos)
      const existing = await prisma.user.findFirst({ where: { nombre: u.nombre } });
      
      if (!existing) {
          await prisma.user.create({ data: u });
      } else {
          // Actualizamos datos existentes
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