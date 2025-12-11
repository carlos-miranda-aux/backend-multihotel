import prisma from "../../src/PrismaClient.js";
import ExcelJS from "exceljs";
import { DEVICE_STATUS, DEFAULTS } from "../config/constants.js";
import * as auditService from "./audit.service.js";

const getTenantFilter = (user) => {
  if (!user || !user.hotelId) return {};
  return { hotelId: user.hotelId };
};

// MODIFICADO: Se añade 'typeIds' a los argumentos desestructurados
export const getActiveDevices = async ({ skip, take, search, filter, sortBy, order, typeIds }, user) => {
  const tenantFilter = getTenantFilter(user);

  const disposedStatus = await prisma.deviceStatus.findFirst({
    where: { nombre: DEVICE_STATUS.DISPOSED }
  });
  const disposedStatusId = disposedStatus?.id;

  const whereClause = {
    ...tenantFilter,
    deletedAt: null
  };

  if (disposedStatusId) {
    whereClause.estadoId = { not: disposedStatusId };
  } else {
    whereClause.estado = { isNot: { nombre: DEVICE_STATUS.DISPOSED } };
  }

  // --- NUEVA LÓGICA DE FILTRADO POR TIPOS MÚLTIPLES ---
  if (typeIds && Array.isArray(typeIds) && typeIds.length > 0) {
      whereClause.tipoId = { in: typeIds };
  }
  // ----------------------------------------------------

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

// ... (El resto de funciones createDevice, updateDevice, etc. se mantienen igual)
export const createDevice = async (data, user) => {
  let hotelIdToAssign = user.hotelId;

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

  const oldDevice = await prisma.device.findFirst({
    where: {
      id: deviceId,
      deletedAt: null,
      ...tenantFilter
    }
  });

  if (!oldDevice) throw new Error("Dispositivo no encontrado o no tienes permiso para editarlo.");

  const disposedStatus = await prisma.deviceStatus.findFirst({ where: { nombre: DEVICE_STATUS.DISPOSED } });
  const disposedStatusId = disposedStatus?.id;

  if (disposedStatusId) {
    if (oldDevice.estadoId === disposedStatusId && data.estadoId && data.estadoId !== disposedStatusId) {
      // Reactivación: Limpiar datos de baja
      data.fecha_baja = null;
      data.motivo_baja = null;
      data.observaciones_baja = null;
    } else if (data.estadoId === disposedStatusId && oldDevice.estadoId !== disposedStatusId) {
      // Baja: Asignar fecha actual solo si no viene una fecha manual en la data
      if (!data.fecha_baja) {
          data.fecha_baja = new Date();
      }
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
      ...tenantFilter
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
      ...tenantFilter
    },
    include: {
      usuario: true,
      tipo: true,
      estado: true,
      sistema_operativo: true,
      area: { include: { departamento: true } },
      hotel: true
    },
  });
};

export const getAllActiveDeviceNames = async (user) => {
  const tenantFilter = getTenantFilter(user);

  const disposedStatus = await prisma.deviceStatus.findFirst({
    where: { nombre: DEVICE_STATUS.DISPOSED }
  });
  const disposedStatusId = disposedStatus?.id;

  const whereClause = {
    deletedAt: null,
    ...tenantFilter
  };

  if (disposedStatusId) {
    whereClause.estadoId = { not: disposedStatusId };
  } else {
    whereClause.estado = { isNot: { nombre: DEVICE_STATUS.DISPOSED } };
  }

  return prisma.device.findMany({
    where: whereClause,
    select: {
      id: true,
      etiqueta: true,
      nombre_equipo: true,
      tipo: { select: { nombre: true } },
      hotelId: true,
      usuario: { select: { id: true, nombre: true } } 
    },
    orderBy: { etiqueta: 'asc' }
  });
};

export const getInactiveDevices = async ({ skip, take, search, startDate, endDate }, user) => {
  const tenantFilter = getTenantFilter(user);

  const disposedStatus = await prisma.deviceStatus.findFirst({
    where: { nombre: DEVICE_STATUS.DISPOSED }
  });
  const disposedStatusId = disposedStatus?.id;

  const whereClause = {
    deletedAt: null,
    ...tenantFilter
  };

  if (disposedStatusId) {
    whereClause.estadoId = disposedStatusId;
  } else {
    whereClause.estado = { nombre: DEVICE_STATUS.DISPOSED };
  }

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

  if (startDate && endDate) {
      whereClause.fecha_baja = {
          gte: new Date(startDate).toISOString(),
          lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString()
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

  const disposedStatus = await prisma.deviceStatus.findFirst({
    where: { nombre: DEVICE_STATUS.DISPOSED }
  });
  const disposedStatusId = disposedStatus?.id;

  const baseWhere = {
    deletedAt: null,
    ...tenantFilter
  };

  if (disposedStatusId) {
    baseWhere.estadoId = { not: disposedStatusId };
  } else {
    baseWhere.estado = { isNot: { nombre: DEVICE_STATUS.DISPOSED } };
  }

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

  const disposedStatus = await prisma.deviceStatus.findFirst({
    where: { nombre: DEVICE_STATUS.DISPOSED }
  });
  const disposedStatusId = disposedStatus?.id;

  const activeFilter = {
    deletedAt: null,
    ...tenantFilter
  };

  if (disposedStatusId) {
    activeFilter.estadoId = { not: disposedStatusId };
  } else {
    activeFilter.estado = { isNot: { nombre: DEVICE_STATUS.DISPOSED } };
  }

  const disposalFilter = {
    deletedAt: null,
    fecha_baja: { gte: firstDayMonth.toISOString(), lte: lastDayMonth.toISOString() },
    ...tenantFilter
  };

  if (disposedStatusId) {
    disposalFilter.estadoId = disposedStatusId;
  } else {
    disposalFilter.estado = { nombre: DEVICE_STATUS.DISPOSED };
  }

  const [
    totalActive,
    withPanda,
    expiredWarranty,
    riskWarranty,
    currentMonthDisposals,
    totalStaff,
    warrantyAlerts,
    devicesByTypeRaw // NUEVO
  ] = await prisma.$transaction([
    prisma.device.count({ where: activeFilter }),
    prisma.device.count({ where: { ...activeFilter, es_panda: true } }),
    prisma.device.count({ where: { ...activeFilter, garantia_fin: { lt: today.toISOString() } } }),
    prisma.device.count({ where: { ...activeFilter, garantia_fin: { gte: today.toISOString(), lte: ninetyDaysFromNow.toISOString() } } }),
    prisma.device.count({ where: disposalFilter }),
    prisma.user.count({
      where: {
        deletedAt: null,
        ...tenantFilter
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
    }),
    // NUEVO: Agrupación por tipo
    prisma.device.groupBy({
        by: ['tipoId'],
        where: activeFilter,
        _count: { tipoId: true }
    })
  ]);

  // Enriquecer los tipos con sus nombres
  const typeIds = devicesByTypeRaw.map(d => d.tipoId);
  const types = await prisma.deviceType.findMany({ where: { id: { in: typeIds } } });
  
  const devicesByType = devicesByTypeRaw.map(item => {
      const typeInfo = types.find(t => t.id === item.tipoId);
      return {
          name: typeInfo ? typeInfo.nombre : "Desconocido",
          value: item._count.tipoId
      };
  }).sort((a, b) => b.value - a.value);

  const withoutPanda = totalActive - withPanda;
  const safeWarranty = totalActive - expiredWarranty - riskWarranty;

  return {
    kpis: {
      totalActiveDevices: totalActive,
      devicesWithPanda: withPanda,
      devicesWithoutPanda: withoutPanda,
      monthlyDisposals: currentMonthDisposals,
      totalStaff: totalStaff
    },
    warrantyStats: {
      expired: expiredWarranty,
      risk: riskWarranty,
      safe: safeWarranty
    },
    warrantyAlertsList: warrantyAlerts,
    devicesByType // NUEVO
  };
};

// ... (Resto de funciones de importación/exportación se mantienen igual, el código se cortaría aquí)
// Asegúrate de mantener importDevicesFromExcel y getExpiredWarrantyAnalysis sin cambios si no los modificaste.
const clean = (txt) => txt ? txt.toString().trim() : "";
const cleanLower = (txt) => {
    if (!txt) return "";
    return txt.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

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
  let item;
  try {
    item = await prisma[modelName].create({ data: { nombre: value } });
  } catch (e) {
    item = await prisma[modelName].findFirst({ where: { nombre: value } });
  }
  if (item) {
    cache.set(key, item.id);
    return item.id;
  }
  return null;
};

const extractRowData = (row, headerMap) => {
  const getVal = (possibleKeys) => {
    const keys = Array.isArray(possibleKeys) ? possibleKeys : [possibleKeys];
    for (const key of keys) {
        const idx = headerMap[cleanLower(key)];
        if (idx) return row.getCell(idx).text?.trim();
    }
    return null;
  };

  const rawOS = getVal(['sistema operativo', 'so', 'os']);
  const osStr = rawOS ? (rawOS.trim().charAt(0).toUpperCase() + rawOS.trim().slice(1).toLowerCase()) : null;

  const pandaStr = getVal(['antivirus', 'panda', 'es panda', 'antivirus panda']);
  const es_panda = ["si", "yes", "verdadero", "true"].includes(cleanLower(pandaStr));

  return {
    etiqueta: getVal(['etiqueta', 'tag']),
    nombre_equipo: getVal(['nombre equipo', 'nombre', 'hostname']),
    serie: getVal(['n° serie', 'serie', 'numero serie', 'serial', 'sn']),
    tipoStr: getVal(['tipo', 'tipo dispositivo']) || DEFAULTS.DEVICE_TYPE,
    estadoStr: getVal(['estado', 'status']) || DEVICE_STATUS.ACTIVE,
    osStr,
    marca: getVal(['marca', 'brand']) || DEFAULTS.BRAND,
    modelo: getVal(['modelo', 'model']) || DEFAULTS.MODEL,
    ip_equipo: getVal(['ip', 'ip equipo', 'direccion ip']) || DEFAULTS.IP,
    descripcion: getVal(['descripcion', 'description']) || "",
    comentarios: getVal(['comentarios', 'observaciones', 'notas']) || null,
    office_version: getVal(['version office', 'office version', 'office']),
    office_licencia: getVal(['tipo licencia', 'tipo de licencia', 'licencia office']),
    garantia_num_prod: getVal(['n producto', 'garantia numero producto', 'numero producto']),
    garantia_inicio: parseExcelDate(getVal(['inicio garantia', 'garantia inicio', 'fecha compra'])),
    garantia_fin: parseExcelDate(getVal(['fin garantia', 'garantia fin', 'vencimiento garantia'])),
    es_panda,
    responsableLogin: getVal(['usuario de login', 'usuario login', 'login', 'usuarios', 'usuario']),
    responsableName: getVal(['responsable (jefe', 'responsable', 'nombre responsable']),
    perfiles: getVal(['perfiles acceso', 'perfiles', 'perfiles de usuario']),
    areaStr: getVal(['área', 'area']),
    deptoStr: getVal(['departamento', 'depto']),
    // LECTURA DE FECHA DE BAJA PARA IMPORTACION
    fecha_baja: parseExcelDate(getVal(['fecha baja', 'fecha de baja', 'baja', 'fecha_baja'])),
    motivo_baja: getVal(['motivo', 'motivo baja']),
    observaciones_baja: getVal(['observaciones baja', 'notas baja'])
  };
};

const resolveForeignKeys = (data, context) => {
  let usuarioId = null;
  if (data.responsableLogin) {
    usuarioId = context.userLoginMap.get(cleanLower(data.responsableLogin));
  }
  if (!usuarioId && data.responsableName) {
    usuarioId = context.userNameMap.get(cleanLower(data.responsableName));
  }

  let areaId = null;
  if (data.areaStr && data.deptoStr) {
    areaId = context.areaMap.get(`${cleanLower(data.areaStr)}|${cleanLower(data.deptoStr)}`);
  }
  if (!areaId && data.areaStr) {
    const possibleArea = context.areasList.find(a => cleanLower(a.nombre) === cleanLower(data.areaStr));
    if (possibleArea) areaId = possibleArea.id;
  }

  return { usuarioId, areaId };
};

export const importDevicesFromExcel = async (buffer, user) => {
  if (!user.hotels || user.hotels.length !== 1) {
    throw new Error("Acceso denegado: Solo administradores de una única propiedad pueden realizar importaciones de inventario.");
  }

  const hotelIdToImport = user.hotels[0].id;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  let worksheet = workbook.getWorksheet(1);
  if (!worksheet && workbook.worksheets.length > 0) {
      worksheet = workbook.worksheets[0];
  }
  
  if (!worksheet) {
      throw new Error("El archivo Excel parece estar dañado o no contiene ninguna hoja de cálculo.");
  }

  const headerMap = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headerMap[cleanLower(cell.value)] = colNumber;
  });

  const validNameHeaders = ['nombre equipo', 'nombre', 'hostname'];
  const validSerialHeaders = ['n° serie', 'serie', 'numero serie', 'serial', 'sn'];
  
  const hasName = validNameHeaders.some(h => headerMap[cleanLower(h)]);
  const hasSerial = validSerialHeaders.some(h => headerMap[cleanLower(h)]);

  if (!hasName && !hasSerial) {
      throw new Error("El archivo no parece ser un inventario válido. Faltan columnas obligatorias como 'Nombre Equipo' o 'N° Serie'.");
  }

  const [areas, users, dbTypes, dbStatuses, dbOS] = await Promise.all([
    prisma.area.findMany({ where: { deletedAt: null, hotelId: hotelIdToImport }, include: { departamento: true } }),
    prisma.user.findMany({ where: { deletedAt: null, hotelId: hotelIdToImport } }),
    prisma.deviceType.findMany({ where: { deletedAt: null } }),
    prisma.deviceStatus.findMany({ where: { deletedAt: null } }),
    prisma.operatingSystem.findMany({ where: { deletedAt: null } })
  ]);

  const context = {
    userLoginMap: new Map(users.filter(i => i.usuario_login).map(i => [cleanLower(i.usuario_login), i.id])),
    userNameMap: new Map(users.map(i => [cleanLower(i.nombre), i.id])),
    areaMap: new Map(areas.map(a => [`${cleanLower(a.nombre)}|${cleanLower(a.departamento?.nombre)}`, a.id])),
    areasList: areas
  };

  const caches = {
    types: new Map(dbTypes.map(t => [cleanLower(t.nombre), t.id])),
    status: new Map(dbStatuses.map(s => [cleanLower(s.nombre), s.id])),
    os: new Map(dbOS.map(o => [cleanLower(o.nombre), o.id]))
  };

  const devicesToProcess = [];
  const warnings = []; 

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowData = extractRowData(row, headerMap);

    if (!rowData.nombre_equipo && !rowData.serie) return;

    const foreignKeys = resolveForeignKeys(rowData, context);
    
    const hasUserInfo = rowData.responsableLogin || rowData.responsableName;
    if (hasUserInfo && !foreignKeys.usuarioId) {
        const userValue = rowData.responsableLogin || rowData.responsableName;
        warnings.push(`Fila ${rowNumber} (${rowData.nombre_equipo || 'Sin Nombre'}): El usuario indicado '${userValue}' no se encontró en el sistema.`);
    }

    const finalNombre = rowData.nombre_equipo || `Equipo Fila ${rowNumber}`;
    const finalSerie = rowData.serie || `SN-GEN-${rowNumber}-${Date.now().toString().slice(-4)}`;

    devicesToProcess.push({
      deviceData: {
        etiqueta: rowData.etiqueta || null, nombre_equipo: finalNombre, numero_serie: finalSerie, marca: rowData.marca, modelo: rowData.modelo,
        ip_equipo: rowData.ip_equipo, descripcion: rowData.descripcion, comentarios: rowData.comentarios || null, perfiles_usuario: rowData.perfiles || null,
        usuarioId: foreignKeys.usuarioId, areaId: foreignKeys.areaId, office_version: rowData.office_version || null, office_tipo_licencia: rowData.office_licencia || null,
        garantia_numero_producto: rowData.garantia_num_prod || null, garantia_inicio: rowData.garantia_inicio, garantia_fin: rowData.garantia_fin, es_panda: rowData.es_panda,
        fecha_baja: rowData.fecha_baja || null,
        motivo_baja: rowData.motivo_baja || null,
        observaciones_baja: rowData.observaciones_baja || null,
      },
      meta: { tipo: rowData.tipoStr, estado: rowData.estadoStr, os: rowData.osStr }
    });
  });

  let successCount = 0;
  const errors = [];

  const disposedStatusDB = dbStatuses.find(s => s.nombre === DEVICE_STATUS.DISPOSED);
  const disposedStatusId = disposedStatusDB ? disposedStatusDB.id : null;

  for (const item of devicesToProcess) {
    try {
      const tipoId = await getOrCreateCatalog('deviceType', item.meta.tipo, caches.types);
      const estadoId = await getOrCreateCatalog('deviceStatus', item.meta.estado, caches.status);
      const sistemaOperativoId = await getOrCreateCatalog('operatingSystem', item.meta.os, caches.os);

      let finalData = { ...item.deviceData, tipoId, estadoId, sistemaOperativoId, hotelId: hotelIdToImport };

      // --- LOGICA DE FECHA DE BAJA ---
      if (disposedStatusId && estadoId === disposedStatusId) {
          // Si el estado es "Inactivo", verificamos si trajo fecha manual
          if (!finalData.fecha_baja) {
              // Si no trajo, ponemos la fecha actual
              finalData.fecha_baja = new Date();
          }
          // Si sí trajo, la dejamos intacta (ya está en finalData.fecha_baja)
      } else {
          // Si NO es inactivo, limpiamos campos de baja
          finalData.fecha_baja = null;
          finalData.motivo_baja = null;
          finalData.observaciones_baja = null;
      }

      const exists = await prisma.device.findFirst({ where: { numero_serie: finalData.numero_serie, hotelId: hotelIdToImport } });

      if (!exists) { await prisma.device.create({ data: finalData }); }
      else { await prisma.device.update({ where: { id: exists.id }, data: { ...finalData, deletedAt: null } }); }
      successCount++;
    } catch (error) {
      errors.push(`Error en equipo '${item.deviceData.nombre_equipo}': ${error.message}`);
    }
  }

  if (successCount > 0) {
    await auditService.logActivity({ action: 'IMPORT', entity: 'Device', entityId: 0, details: `Importación masiva: ${successCount} equipos en Hotel ID: ${hotelIdToImport}.`, user: user });
  }
  
  return { successCount, errors, warnings };
};

export const getExpiredWarrantyAnalysis = async (startDate, endDate, user) => {
  const tenantFilter = getTenantFilter(user);

  const disposedStatus = await prisma.deviceStatus.findFirst({
    where: { nombre: DEVICE_STATUS.DISPOSED }
  });
  const disposedStatusId = disposedStatus?.id;

  const whereClause = {
    deletedAt: null,
    garantia_fin: {
      lt: new Date().toISOString()
    },
    ...tenantFilter
  };

  if (disposedStatusId) {
    whereClause.estadoId = { not: disposedStatusId };
  } else {
    whereClause.estado = { isNot: { nombre: DEVICE_STATUS.DISPOSED } };
  }

  const devices = await prisma.device.findMany({
    where: whereClause,
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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