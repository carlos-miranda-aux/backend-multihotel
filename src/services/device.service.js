// src/services/device.service.js
import prisma from "../../src/PrismaClient.js";
import ExcelJS from "exceljs";
import { DEVICE_STATUS, DEFAULTS } from "../config/constants.js";
import * as auditService from "./audit.service.js"; 

// Helper para construir el filtro de tenant
const getTenantFilter = (user) => {
  if (!user || !user.hotelId) return {}; // Si es Global (Root/Auditor), ve todo
  return { hotelId: user.hotelId }; // Si tiene hotelId, se filtra
};

// =====================================================================
// SECCIÓN 1: FUNCIONES CRUD ESTÁNDAR
// =====================================================================

export const getActiveDevices = async ({ skip, take, search, filter, sortBy, order }, user) => {
  const tenantFilter = getTenantFilter(user);

  const whereClause = {
    ...tenantFilter, // 🛡️ FILTRO MULTI-TENANT
    estado: { NOT: { nombre: DEVICE_STATUS.DISPOSED } },
    deletedAt: null 
  };

  if (search) {
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push({
      OR: [
        { etiqueta: { contains: search } },
        { nombre_equipo: { contains: search } },
        { numero_serie: { contains: search } },
        { marca: { contains: search } },
        { modelo: { contains: search } },
        { ip_equipo: { contains: search } },
        { perfiles_usuario: { contains: search } },
        { comentarios: { contains: search } },
      ]
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ninetyDaysFromNow = new Date(today);
  ninetyDaysFromNow.setDate(today.getDate() + 90);
  ninetyDaysFromNow.setHours(23, 59, 59, 999);

  if (filter === 'no-panda') {
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push({ es_panda: false });
  } else if (filter === 'warranty-risk') {
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push({
      garantia_fin: { gte: today.toISOString(), lte: ninetyDaysFromNow.toISOString() }
    });
  } else if (filter === 'expired-warranty') {
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push({ garantia_fin: { lt: today.toISOString() } });
  } else if (filter === 'safe-warranty') {
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push({
      OR: [
        { garantia_fin: { gt: ninetyDaysFromNow.toISOString() } },
        { garantia_fin: null }
      ]
    });
  }

  let orderByClause = {};
  if (sortBy) {
    if (sortBy.includes('.')) {
      const [relation, field] = sortBy.split('.');
      orderByClause = { [relation]: { [field]: order } };
    } else {
      orderByClause = { [sortBy]: order };
    }
  } else {
    orderByClause = { id: 'desc' };
  }

  const [devices, totalCount] = await prisma.$transaction([
    prisma.device.findMany({
      where: whereClause,
      include: {
        usuario: true,
        tipo: true,
        estado: true,
        sistema_operativo: true,
        maintenances: { where: { deletedAt: null } },
        area: { include: { departamento: true } },
      },
      skip: skip,
      take: take,
      orderBy: orderByClause
    }),
    prisma.device.count({ where: whereClause }),
  ]);

  return { devices, totalCount };
};

export const createDevice = async (data, user) => {
  // 🛡️ Asignar el hotel automáticamente
  let hotelIdToAssign = user.hotelId;
  
  // Si es ROOT y no tiene hotelId en el token, debe venir en la data
  if (!hotelIdToAssign && data.hotelId) {
      hotelIdToAssign = Number(data.hotelId);
  }
  
  if (!hotelIdToAssign) {
      throw new Error("Error crítico: No se puede crear un dispositivo sin asignar un Hotel (Tenant).");
  }

  const newDevice = await prisma.device.create({ 
      data: {
          ...data,
          hotelId: hotelIdToAssign 
      }
  });

  await auditService.logActivity({
    action: 'CREATE',
    entity: 'Device',
    entityId: newDevice.id,
    newData: newDevice,
    user: user,
    details: `Dispositivo creado: ${newDevice.nombre_equipo}`
  });

  return newDevice;
};

export const updateDevice = async (id, data, user) => {
  const deviceId = Number(id);
  const tenantFilter = getTenantFilter(user);

  // Verificamos que el dispositivo exista Y pertenezca al hotel del usuario
  const oldDevice = await prisma.device.findFirst({
    where: { 
        id: deviceId, 
        deletedAt: null,
        ...tenantFilter // 🛡️ Seguridad
    }
  });

  if (!oldDevice) throw new Error("Dispositivo no encontrado o no tienes permiso para editarlo.");

  const disposedStatus = await prisma.deviceStatus.findFirst({ where: { nombre: DEVICE_STATUS.DISPOSED } });
  const disposedStatusId = disposedStatus?.id;

  if (disposedStatusId) {
    if (oldDevice.estadoId === disposedStatusId && data.estadoId && data.estadoId !== disposedStatusId) {
      data.fecha_baja = null;
      data.motivo_baja = null;
      data.observaciones_baja = null;
    }
    else if (data.estadoId === disposedStatusId && oldDevice.estadoId !== disposedStatusId) {
      data.fecha_baja = new Date();
    }
  }

  const updatedDevice = await prisma.device.update({
    where: { id: deviceId },
    data,
  });

  await auditService.logActivity({
    action: 'UPDATE',
    entity: 'Device',
    entityId: updatedDevice.id,
    oldData: oldDevice,
    newData: updatedDevice,
    user: user,
    details: `Actualización de equipo: ${updatedDevice.nombre_equipo}`
  });

  return updatedDevice;
};

export const deleteDevice = async (id, user) => {
  const deviceId = Number(id);
  const tenantFilter = getTenantFilter(user);

  const oldDevice = await prisma.device.findFirst({ 
      where: { 
          id: deviceId,
          ...tenantFilter // 🛡️ Seguridad
      } 
  });

  if (!oldDevice) throw new Error("Dispositivo no encontrado o sin permisos.");

  const deletedDevice = await prisma.device.update({
    where: { id: deviceId },
    data: { deletedAt: new Date() }
  });

  await auditService.logActivity({
    action: 'DELETE',
    entity: 'Device',
    entityId: deviceId,
    oldData: oldDevice,
    user: user,
    details: `Dispositivo eliminado (Soft Delete)`
  });

  return deletedDevice;
};

export const getDeviceById = (id, user) => {
  const tenantFilter = getTenantFilter(user);
  
  return prisma.device.findFirst({
    where: {
      id: Number(id),
      deletedAt: null,
      ...tenantFilter // 🛡️ Seguridad
    },
    include: {
      usuario: true,
      tipo: true,
      estado: true,
      sistema_operativo: true,
      area: { include: { departamento: true } },
    },
  });
};

export const getAllActiveDeviceNames = (user) => {
  const tenantFilter = getTenantFilter(user);

  return prisma.device.findMany({
    where: {
      estado: { NOT: { nombre: DEVICE_STATUS.DISPOSED } },
      deletedAt: null,
      ...tenantFilter // 🛡️ Seguridad
    },
    select: {
      id: true,
      etiqueta: true,
      nombre_equipo: true,
      tipo: { select: { nombre: true } }
    },
    orderBy: { etiqueta: 'asc' }
  });
};

export const getInactiveDevices = async ({ skip, take, search }, user) => {
  const tenantFilter = getTenantFilter(user);

  const whereClause = {
    estado: { nombre: DEVICE_STATUS.DISPOSED },
    deletedAt: null,
    ...tenantFilter // 🛡️ Seguridad
  };

  if (search) {
    whereClause.AND = {
      OR: [
        { etiqueta: { contains: search } },
        { nombre_equipo: { contains: search } },
        { numero_serie: { contains: search } },
        { motivo_baja: { contains: search } },
      ]
    };
  }

  const [devices, totalCount] = await prisma.$transaction([
    prisma.device.findMany({
      where: whereClause,
      include: {
        usuario: true,
        tipo: true,
        estado: true,
        sistema_operativo: true,
        area: { include: { departamento: true } },
      },
      skip: skip,
      take: take,
      orderBy: { fecha_baja: 'desc' }
    }),
    prisma.device.count({ where: whereClause }),
  ]);

  return { devices, totalCount };
};

export const getPandaStatusCounts = async (user) => {
  const tenantFilter = getTenantFilter(user);

  const baseWhere = {
    estado: { NOT: { nombre: DEVICE_STATUS.DISPOSED } },
    deletedAt: null,
    ...tenantFilter // 🛡️ Seguridad
  };

  const totalActiveDevices = await prisma.device.count({ where: baseWhere });

  const devicesWithPanda = await prisma.device.count({
    where: { ...baseWhere, es_panda: true }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredWarrantiesCount = await prisma.device.count({
    where: { ...baseWhere, garantia_fin: { lt: today.toISOString() } }
  });

  const devicesWithoutPanda = totalActiveDevices - devicesWithPanda;

  return {
    totalActiveDevices,
    devicesWithPanda,
    devicesWithoutPanda,
    expiredWarrantiesCount
  };
};

export const getDashboardStats = async (user) => {
  const tenantFilter = getTenantFilter(user);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ninetyDaysFromNow = new Date(today);
  ninetyDaysFromNow.setDate(today.getDate() + 90);
  ninetyDaysFromNow.setHours(23, 59, 59, 999);

  const date = new Date();
  const firstDayMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDayMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  lastDayMonth.setHours(23, 59, 59, 999);

  const activeFilter = {
    estado: { NOT: { nombre: DEVICE_STATUS.DISPOSED } },
    deletedAt: null,
    ...tenantFilter // 🛡️ Seguridad
  };

  const [
    totalActive,
    withPanda,
    expiredWarranty,
    riskWarranty,
    currentMonthDisposals,
    warrantyAlerts
  ] = await prisma.$transaction([
    prisma.device.count({ where: activeFilter }),
    prisma.device.count({ where: { ...activeFilter, es_panda: true } }),
    prisma.device.count({ where: { ...activeFilter, garantia_fin: { lt: today.toISOString() } } }),
    prisma.device.count({ where: { ...activeFilter, garantia_fin: { gte: today.toISOString(), lte: ninetyDaysFromNow.toISOString() } } }),
    prisma.device.count({
      where: {
        estado: { nombre: DEVICE_STATUS.DISPOSED },
        fecha_baja: { gte: firstDayMonth.toISOString(), lte: lastDayMonth.toISOString() },
        deletedAt: null,
        ...tenantFilter // 🛡️ Seguridad
      }
    }),
    prisma.device.findMany({
      where: {
        ...activeFilter,
        garantia_fin: {
          gte: today.toISOString(),
          lte: ninetyDaysFromNow.toISOString()
        }
      },
      select: {
        id: true,
        nombre_equipo: true,
        etiqueta: true,
        garantia_fin: true
      },
      orderBy: { garantia_fin: 'asc' }
    })
  ]);

  const withoutPanda = totalActive - withPanda;
  const safeWarranty = totalActive - expiredWarranty - riskWarranty;

  return {
    kpis: {
      totalActiveDevices: totalActive,
      devicesWithPanda: withPanda,
      devicesWithoutPanda: withoutPanda,
      monthlyDisposals: currentMonthDisposals
    },
    warrantyStats: {
      expired: expiredWarranty,
      risk: riskWarranty,
      safe: safeWarranty
    },
    warrantyAlertsList: warrantyAlerts
  };
};

// =====================================================================
// SECCIÓN 2: HELPERS PARA IMPORTACIÓN
// =====================================================================

const clean = (txt) => txt ? txt.toString().trim() : "";
const cleanLower = (txt) => clean(txt).toLowerCase();

const parseExcelDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch (e) {
    return null;
  }
};

const getOrCreateCatalog = async (modelName, value, cache) => {
  if (!value) return null;
  const key = cleanLower(value);

  if (cache.has(key)) return cache.get(key);

  let item = await prisma[modelName].findFirst({ where: { nombre: value, deletedAt: null } });

  if (!item) {
    try {
      item = await prisma[modelName].create({ data: { nombre: value } });
    } catch (e) {
      item = await prisma[modelName].findFirst({ where: { nombre: value } });
    }
  }

  if (item) {
    cache.set(key, item.id);
    return item.id;
  }
  return null;
};

const extractRowData = (row, headerMap) => {
  const getVal = (key) => {
    const idx = headerMap[key];
    return idx ? row.getCell(idx).text?.trim() : null;
  };

  const rawOS = getVal('sistema operativo') || getVal('so') || getVal('os');
  const osStr = rawOS ? (rawOS.trim().charAt(0).toUpperCase() + rawOS.trim().slice(1).toLowerCase()) : null;

  const pandaStr = getVal('antivirus') || getVal('panda') || getVal('es panda');
  const es_panda = ["si", "yes", "verdadero", "true"].includes(cleanLower(pandaStr));

  return {
    etiqueta: getVal('etiqueta'),
    nombre_equipo: getVal('nombre equipo') || getVal('nombre'),
    serie: getVal('n° serie') || getVal('serie') || getVal('numero serie') || getVal('serial'),
    tipoStr: getVal('tipo') || DEFAULTS.DEVICE_TYPE,
    estadoStr: getVal('estado') || DEVICE_STATUS.ACTIVE,
    osStr,
    marca: getVal('marca') || DEFAULTS.BRAND,
    modelo: getVal('modelo') || DEFAULTS.MODEL,
    ip_equipo: getVal('ip') || getVal('ip equipo') || DEFAULTS.IP,
    descripcion: getVal('descripcion') || "",
    comentarios: getVal('comentarios') || getVal('observaciones') || getVal('notas'),
    office_version: getVal('version office') || getVal('office version'),
    office_licencia: getVal('tipo licencia') || getVal('tipo de licencia'),
    garantia_num_prod: getVal('n producto') || getVal('garantia numero producto'),
    garantia_inicio: parseExcelDate(getVal('inicio garantia') || getVal('garantia inicio')),
    garantia_fin: parseExcelDate(getVal('fin garantia') || getVal('garantia fin')),
    es_panda,
    responsableLogin: getVal('usuario de login') || getVal('usuario login') || getVal('login') || getVal('usuarios') || getVal('usuario'),
    responsableName: getVal('responsable (jefe') || getVal('responsable'),
    perfiles: getVal('perfiles acceso') || getVal('perfiles') || getVal('perfiles de usuario'),
    areaStr: getVal('área') || getVal('area'),
    deptoStr: getVal('departamento')
  };
};

// Necesitamos el hotelId del usuario para filtrar las búsquedas en los mapas
const resolveForeignKeys = (data, context) => {
  let usuarioId = null;
  if (data.responsableLogin) {
    usuarioId = context.userLoginMap.get(cleanLower(data.responsableLogin));
  }
  if (!usuarioId && data.responsableName) {
    usuarioId = context.userNameMap.get(cleanLower(data.responsableName));
  }

  let areaId = null;
  // Intentamos match exacto con depto
  if (data.areaStr && data.deptoStr) {
    areaId = context.areaMap.get(`${cleanLower(data.areaStr)}|${cleanLower(data.deptoStr)}`);
  }
  // Fallback solo nombre de area
  if (!areaId && data.areaStr) {
    const possibleArea = context.areasList.find(a => cleanLower(a.nombre) === cleanLower(data.areaStr));
    if (possibleArea) areaId = possibleArea.id;
  }

  return { usuarioId, areaId };
};

// =====================================================================
// SECCIÓN 3: FUNCIÓN PRINCIPAL DE IMPORTACIÓN
// =====================================================================

export const importDevicesFromExcel = async (buffer, user) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);
  
  const tenantFilter = getTenantFilter(user);

  // 1. Cargamos datos CONTEXTUALES al hotel del usuario
  const [areas, users] = await Promise.all([
    prisma.area.findMany({
      where: { deletedAt: null, ...tenantFilter }, // 🛡️ Solo áreas del hotel
      include: { departamento: true }
    }),
    prisma.user.findMany({ 
        where: { deletedAt: null, ...tenantFilter } // 🛡️ Solo usuarios del hotel
    }),
  ]);

  const context = {
    userLoginMap: new Map(users.filter(i => i.usuario_login).map(i => [cleanLower(i.usuario_login), i.id])),
    userNameMap: new Map(users.map(i => [cleanLower(i.nombre), i.id])),
    areaMap: new Map(areas.map(a => [`${cleanLower(a.nombre)}|${cleanLower(a.departamento?.nombre)}`, a.id])),
    areasList: areas
  };

  const headerMap = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headerMap[cleanLower(cell.value)] = colNumber;
  });

  const devicesToProcess = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const rowData = extractRowData(row, headerMap);
    const foreignKeys = resolveForeignKeys(rowData, context);

    const finalNombre = rowData.nombre_equipo || `Equipo Fila ${rowNumber}`;
    const finalSerie = rowData.serie || `SN-GEN-${rowNumber}-${Date.now().toString().slice(-4)}`;

    devicesToProcess.push({
      deviceData: {
        etiqueta: rowData.etiqueta || null,
        nombre_equipo: finalNombre,
        numero_serie: finalSerie,
        marca: rowData.marca,
        modelo: rowData.modelo,
        ip_equipo: rowData.ip_equipo,
        descripcion: rowData.descripcion,
        comentarios: rowData.comentarios || null,
        perfiles_usuario: rowData.perfiles || null,
        usuarioId: foreignKeys.usuarioId,
        areaId: foreignKeys.areaId,
        office_version: rowData.office_version || null,
        office_tipo_licencia: rowData.office_licencia || null,
        garantia_numero_producto: rowData.garantia_num_prod || null,
        garantia_inicio: rowData.garantia_inicio,
        garantia_fin: rowData.garantia_fin,
        es_panda: rowData.es_panda,
      },
      meta: {
        tipo: rowData.tipoStr,
        estado: rowData.estadoStr,
        os: rowData.osStr
      }
    });
  });

  let successCount = 0;
  const errors = [];

  const caches = {
    types: new Map(),
    status: new Map(),
    os: new Map()
  };
  
  // Asignamos el hotelId del usuario que importa
  let hotelIdToImport = user.hotelId;
  if (!hotelIdToImport) {
     // Si es root, debería venir en algún lado o fallar, para simplificar, 
     // en importación masiva por root asumimos que no se soporta o se requiere un header especial.
     // Por seguridad, si no hay hotelId en usuario, detenemos importación masiva de equipos 
     // (a menos que quieras permitir importar a "null" o a un hotel default).
     // Por ahora, lanzamos error si es Root puro sin seleccionar hotel contexto.
     // Sin embargo, si es Root, el filtro getTenantFilter devuelve {}, asi que esto podría mezclar datos.
     // Recomendación: Root debe loguearse como un usuario específico de hotel o pasar un header.
     // Para MVP, asumimos que importación solo la hacen Admins Locales.
  }

  for (const item of devicesToProcess) {
    try {
      if (!hotelIdToImport) {
         throw new Error("El usuario Root debe especificar un Hotel para importar (Funcionalidad pendiente). Usa un Admin Local.");
      }

      const tipoId = await getOrCreateCatalog('deviceType', item.meta.tipo, caches.types);
      const estadoId = await getOrCreateCatalog('deviceStatus', item.meta.estado, caches.status);
      const sistemaOperativoId = await getOrCreateCatalog('operatingSystem', item.meta.os, caches.os);

      const finalData = {
        ...item.deviceData,
        tipoId,
        estadoId,
        sistemaOperativoId,
        hotelId: hotelIdToImport // 🛡️ Asignamos el hotel
      };

      // Verificamos duplicados SOLO dentro del mismo hotel
      const exists = await prisma.device.findFirst({ 
          where: { 
              numero_serie: finalData.numero_serie,
              hotelId: hotelIdToImport 
          } 
      });

      if (!exists) {
        await prisma.device.create({ data: finalData });
      } else {
        await prisma.device.update({
          where: { id: exists.id },
          data: {
            ...finalData,
            deletedAt: null
          }
        });
      }
      successCount++;

    } catch (error) {
      errors.push(`Error en equipo '${item.deviceData.nombre_equipo}': ${error.message}`);
    }
  }

  // 📝 REGISTRAR AUDITORÍA MASIVA
  if (successCount > 0) {
    await auditService.logActivity({
      action: 'IMPORT',
      entity: 'Device',
      entityId: 0,
      details: `Importación masiva: ${successCount} equipos procesados en Hotel ID: ${hotelIdToImport}.`,
      user: user
    });
  }

  return { successCount, errors };
};

export const getExpiredWarrantyAnalysis = async (startDate, endDate, user) => {
  const tenantFilter = getTenantFilter(user);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const devices = await prisma.device.findMany({
    where: {
      estado: { NOT: { nombre: DEVICE_STATUS.DISPOSED } },
      deletedAt: null,
      garantia_fin: {
        lt: today.toISOString()
      },
      ...tenantFilter // 🛡️ Seguridad
    },
    include: {
      tipo: { select: { nombre: true } },
      maintenances: {
        select: {
          estado: true,
          tipo_mantenimiento: true,
          fecha_realizacion: true,
        },
        where: {
          estado: 'realizado',
          tipo_mantenimiento: 'Correctivo',
          deletedAt: null,
          fecha_realizacion: {
            ...(startDate && { gte: new Date(startDate).toISOString() }),
            ...(endDate && { lte: new Date(endDate).toISOString() }),
          }
        },
        orderBy: {
          fecha_realizacion: 'desc'
        }
      },
    },
    orderBy: {
      garantia_fin: 'asc'
    }
  });

  return devices.map(d => {
    const correctives = d.maintenances.filter(m =>
      m.tipo_mantenimiento === 'Correctivo' && m.estado === 'realizado'
    );

    const lastCorrectiveDate = correctives.length > 0
      ? correctives[0].fecha_realizacion
      : null;

    const warrantyEnd = d.garantia_fin ? new Date(d.garantia_fin) : null;
    let daysExpired = null;
    if (warrantyEnd) {
      const diffTime = today.getTime() - warrantyEnd.getTime();
      daysExpired = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      etiqueta: d.etiqueta || "N/A",
      nombre_equipo: d.nombre_equipo || "N/A",
      numero_serie: d.numero_serie || "N/A",
      marca: d.marca || "N/A",
      modelo: d.modelo || "N/A",
      garantia_fin: warrantyEnd,
      daysExpired: daysExpired,
      correctiveCount: correctives.length,
      lastCorrective: lastCorrectiveDate,
    };
  });
};