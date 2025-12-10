import prisma from "../../src/PrismaClient.js";
import ExcelJS from "exceljs";
import * as auditService from "./audit.service.js"; 

const getTenantFilter = (user) => {
  if (!user || !user.hotelId) return {}; 
  return { hotelId: user.hotelId }; 
};

export const getUsers = async ({ skip, take, search, sortBy, order }, user) => {
  const tenantFilter = getTenantFilter(user);
  
  const whereClause = { deletedAt: null, ...tenantFilter };

  if (search) {
    whereClause.OR = [
      { nombre: { contains: search } },
      { correo: { contains: search } },
      { usuario_login: { contains: search } }
    ];
  }

  let orderBy = { nombre: 'asc' };
  if (sortBy) {
    if (sortBy.includes('.')) {
      const parts = sortBy.split('.');
      if (parts.length === 2) orderBy = { [parts[0]]: { [parts[1]]: order } };
    } else {
      orderBy = { [sortBy]: order };
    }
  }

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      where: whereClause,
      include: {
        area: { include: { departamento: true } },
        hotel: { select: { nombre: true, codigo: true } }
      },
      skip: skip,
      take: take,
      orderBy: orderBy
    }),
    prisma.user.count({ where: whereClause })
  ]);

  return { users, totalCount };
};

export const getAllUsers = (user) => {
    const tenantFilter = getTenantFilter(user);
    return prisma.user.findMany({
        where: { deletedAt: null, ...tenantFilter },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' }
    });
};

export const getUserById = (id, user) => {
    const tenantFilter = getTenantFilter(user);
    return prisma.user.findFirst({
        where: {
            id: Number(id),
            deletedAt: null,
            ...tenantFilter
        },
        include: { area: { include: { departamento: true } } }
    });
};

export const createUser = async (data, user) => {
  let hotelIdToAssign = user.hotelId;
  
  if (!hotelIdToAssign && data.hotelId) {
      hotelIdToAssign = Number(data.hotelId);
  }
  
  if (!hotelIdToAssign) {
      throw new Error("Se requiere un Hotel para crear al empleado.");
  }

  if (data.areaId) {
      const area = await prisma.area.findFirst({ 
          where: { id: Number(data.areaId), hotelId: hotelIdToAssign }
      });
      if (!area) throw new Error("El área seleccionada no pertenece al hotel asignado.");
  }

  const newUser = await prisma.user.create({
    data: {
      ...data,
      areaId: data.areaId ? Number(data.areaId) : null,
      hotelId: hotelIdToAssign
    },
  });

  await auditService.logActivity({
    action: 'CREATE',
    entity: 'User',
    entityId: newUser.id,
    newData: newUser,
    user: user,
    details: `Staff creado: ${newUser.nombre}`
  });

  return newUser;
};

export const updateUser = async (id, data, user) => {
  const userId = Number(id);
  const tenantFilter = getTenantFilter(user);
  
  const oldUser = await prisma.user.findFirst({ where: { id: userId, ...tenantFilter } });
  
  if (!oldUser) throw new Error("Empleado no encontrado o sin permisos.");

  if (data.areaId) {
      const area = await prisma.area.findFirst({ 
          where: { id: Number(data.areaId), hotelId: oldUser.hotelId }
      });
      if (!area) throw new Error("El área destino no es válida para este hotel.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      areaId: data.areaId ? Number(data.areaId) : null
    },
  });
  
  await auditService.logActivity({
    action: 'UPDATE',
    entity: 'User',
    entityId: userId,
    oldData: oldUser,
    newData: updatedUser,
    user: user,
    details: `Staff actualizado: ${updatedUser.nombre}`
  });

  return updatedUser;
};

export const deleteUser = async (id, user) => {
  const userId = Number(id);
  const tenantFilter = getTenantFilter(user);
  
  const oldUser = await prisma.user.findFirst({ where: { id: userId, ...tenantFilter } });
  
  if (!oldUser) throw new Error("Empleado no encontrado o sin permisos.");

  const deleted = await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() }
  });
  
  await auditService.logActivity({
    action: 'DELETE',
    entity: 'User',
    entityId: userId,
    oldData: oldUser,
    user: user,
    details: `Staff eliminado (Soft Delete)`
  });

  return deleted;
};

// --- NORMALIZACIÓN ROBUSTA (Igual que en DeviceService) ---
const clean = (txt) => txt ? txt.toString().trim() : "";
// Normaliza: minúsculas, sin acentos (NFD) y sin diacríticos especiales
const cleanLower = (txt) => {
    if (!txt) return "";
    return txt.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const extractRowData = (row, headerMap) => {
  // Función auxiliar flexible para extraer datos de columnas con múltiples posibles nombres
  const getVal = (possibleKeys) => {
    const keys = Array.isArray(possibleKeys) ? possibleKeys : [possibleKeys];
    for (const key of keys) {
        // Busca la clave normalizada en el mapa de cabeceras
        const idx = headerMap[cleanLower(key)];
        if (idx) return row.getCell(idx).text?.trim();
    }
    return null;
  };

  const nombreRaw = getVal(['nombre', 'nombre completo', 'empleado']);
  const correo = getVal(['correo', 'email', 'e-mail']);
  const areaNombre = getVal(['área', 'area', 'nombre area']); 
  const deptoNombre = getVal(['departamento', 'depto', 'dept']);
  const usuario_login = getVal(['usuario de login', 'usuario', 'login', 'user', 'usuario login']);
  const esJefeRaw = getVal(['es jefe', 'jefe', 'es jefe de area', 'jefe area']);

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
    // Compara usando claves normalizadas (ej: "recepcion|division cuartos")
    const key = `${cleanLower(data.areaNombre)}|${cleanLower(data.deptoNombre)}`;
    areaId = context.areaMap.get(key);

    if (!areaId) {
      // Intento de recuperación flexible: Buscar solo por nombre de área normalizado
      // Esto ayuda si el departamento en el Excel tiene un nombre ligeramente diferente al de la BD
      const areasFound = context.areasList.filter(a => cleanLower(a.nombre) === cleanLower(data.areaNombre));
      if (areasFound.length === 1) areaId = areasFound[0].id;
    }
  }
  return areaId;
};

export const importUsersFromExcel = async (buffer, user) => {
  if (!user.hotels || user.hotels.length !== 1) {
      throw new Error("Acceso denegado: Solo administradores de una única propiedad pueden realizar importaciones masivas.");
  }

  const hotelIdToImport = user.hotels[0].id;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);

  // --- 1. LEER Y NORMALIZAR ENCABEZADOS ---
  const headerMap = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    // Almacena la cabecera normalizada para búsquedas insensibles a acentos
    headerMap[cleanLower(cell.value)] = colNumber;
  });

  // --- 2. VALIDAR COLUMNAS ---
  const validNameHeaders = ['nombre', 'nombre completo', 'empleado'];
  // Verificamos si existe alguna de las cabeceras válidas normalizadas
  const hasName = validNameHeaders.some(h => headerMap[cleanLower(h)]);

  if (!hasName) {
      throw new Error("El archivo no es válido: Falta la columna 'Nombre' en el encabezado.");
  }

  // Verificación secundaria para asegurar contexto
  const secondaryColumns = ['correo', 'email', 'área', 'area', 'departamento', 'usuario', 'login']; 
  const hasSecondaryData = secondaryColumns.some(col => headerMap[cleanLower(col)]);
  
  if (!hasSecondaryData) {
       throw new Error("El archivo no parece ser un reporte de Staff válido. Faltan columnas clave como 'Correo', 'Área' o 'Departamento'.");
  }

  const usersToCreate = [];
  const errors = [];

  // Obtenemos áreas de la BD para hacer el cruce
  const areas = await prisma.area.findMany({
    where: { 
        deletedAt: null,
        hotelId: hotelIdToImport 
    },
    include: { departamento: true }
  });

  // Contexto con claves normalizadas (sin acentos)
  const context = {
    // Mapa: "area|departamento" -> ID
    areaMap: new Map(areas.map(a => [`${cleanLower(a.nombre)}|${cleanLower(a.departamento?.nombre)}`, a.id])),
    areasList: areas
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const rowData = extractRowData(row, headerMap);

    // Si no tiene nombre, ignoramos la fila (puede ser fila vacía al final del excel)
    if (!rowData.nombre) return; 

    const areaId = resolveArea(rowData, context);

    usersToCreate.push({
      nombre: rowData.nombre,
      correo: rowData.correo,
      areaId,
      usuario_login: rowData.usuario_login,
      es_jefe_de_area: rowData.es_jefe_de_area,
      hotelId: hotelIdToImport
    });
  });

  if (usersToCreate.length === 0) {
      throw new Error("No se encontraron registros válidos para importar en el archivo.");
  }

  let successCount = 0;

  for (const u of usersToCreate) {
    try {
      // Buscamos si el usuario ya existe por nombre exacto en este hotel
      const existing = await prisma.user.findFirst({ 
          where: { 
              nombre: u.nombre,
              hotelId: hotelIdToImport
          } 
      });

      if (!existing) {
        await prisma.user.create({ data: u });
      } else {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            ...u,
            deletedAt: null 
          }
        });
      }
      successCount++;
    } catch (error) {
      errors.push(`Error BD en fila '${u.nombre}': ${error.message}`);
    }
  }

  if (successCount > 0) {
    await auditService.logActivity({
      action: 'IMPORT',
      entity: 'User',
      entityId: 0,
      details: `Importación masiva de Staff: ${successCount} registros procesados en Hotel ID: ${hotelIdToImport}.`,
      user: user
    });
  }

  return { successCount, errors };
};