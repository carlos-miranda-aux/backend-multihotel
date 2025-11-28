// src/services/device.service.js

import prisma from "../../src/PrismaClient.js";
import ExcelJS from "exceljs";

// =====================================================================
// SECCIÓN 1: FUNCIONES CRUD ESTÁNDAR
// =====================================================================

export const getActiveDevices = async ({ skip, take, search, filter }) => { // 👈 ACEPTA filter
  const whereClause = {
    estado: { NOT: { nombre: "Baja" } },
  };

  if (search) {
    whereClause.OR = [
      { etiqueta: { contains: search } },
      { nombre_equipo: { contains: search } },
      { numero_serie: { contains: search } },
      { marca: { contains: search } },
      { modelo: { contains: search } },
      { ip_equipo: { contains: search } },
      { perfiles_usuario: { contains: search } },
    ];
  }
  
  // 👇 LÓGICA DE FILTRADO
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  const ninetyDaysFromNow = new Date(today);
  ninetyDaysFromNow.setDate(today.getDate() + 90);
  ninetyDaysFromNow.setHours(23, 59, 59, 999); 
  
  if (filter === 'no-panda') {
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({ es_panda: false });
  } else if (filter === 'warranty-risk') {
      // Garantías por vencer (90 días)
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({
          garantia_fin: {
              gte: today.toISOString(), 
              lte: ninetyDaysFromNow.toISOString() 
          }
      });
  } else if (filter === 'expired-warranty') {
      // Garantías ya vencidas (Fecha Fin < Hoy)
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({
          garantia_fin: {
              lt: today.toISOString()
          }
      });
  }

  const [devices, totalCount] = await prisma.$transaction([
    prisma.device.findMany({
      where: whereClause,
      include: {
        usuario: true,
        tipo: true,
        estado: true,
        sistema_operativo: true,
        maintenances: true,
        area: { include: { departamento: true } },
      },
      skip: skip,
      take: take,
      orderBy: { id: 'desc' }
    }),
    prisma.device.count({ where: whereClause }),
  ]);

  return { devices, totalCount };
};

export const createDevice = (data) => prisma.device.create({ data });

export const updateDevice = (id, data) =>
  prisma.device.update({
    where: { id: Number(id) },
    data,
  });

export const deleteDevice = (id) =>
  prisma.device.delete({
    where: { id: Number(id) },
  });

export const getDeviceById = (id) =>
  prisma.device.findUnique({
    where: { id: Number(id) },
    include: {
      usuario: true,
      tipo: true,
      estado: true,
      sistema_operativo: true,
      area: { include: { departamento: true } },
    },
  });

export const getAllActiveDeviceNames = () =>
  prisma.device.findMany({
    where: { estado: { NOT: { nombre: "Baja" } } },
    select: {
      id: true,
      etiqueta: true,
      nombre_equipo: true,
      tipo: { select: { nombre: true } }
    },
    orderBy: { etiqueta: 'asc' }
  });

export const getInactiveDevices = async ({ skip, take, search }) => {
  const whereClause = {
    estado: { nombre: "Baja" },
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
        // Aseguramos que todas las relaciones estén incluidas
        usuario: true, // <-- DEBE SER TRUE para obtener nombre y login
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

// FUNCIÓN PARA OBTENER EL CONTEO DE PANDA Y GARANTÍAS VENCIDAS
export const getPandaStatusCounts = async () => {
    // Solo contamos los dispositivos activos
    const totalActiveDevices = await prisma.device.count({
        where: {
            estado: { NOT: { nombre: "Baja" } }
        }
    });

    const devicesWithPanda = await prisma.device.count({
        where: {
            estado: { NOT: { nombre: "Baja" } },
            es_panda: true
        }
    });

    // 👇 CONTEO DE GARANTÍAS VENCIDAS
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const expiredWarrantiesCount = await prisma.device.count({
        where: {
            estado: { NOT: { nombre: "Baja" } },
            garantia_fin: {
                lt: today.toISOString()
            }
        }
    });
    // ---------------------------------

    // Se calcula el conteo de dispositivos sin Panda (críticos)
    const devicesWithoutPanda = totalActiveDevices - devicesWithPanda;

    return {
        totalActiveDevices,
        devicesWithPanda,
        devicesWithoutPanda,
        expiredWarrantiesCount // 👈 EXPONER EL CONTEO
    };
};

// =====================================================================
// SECCIÓN 2: IMPORTACIÓN MASIVA INTELIGENTE (omitted for brevity)
// =====================================================================

export const importDevicesFromExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);

  const devicesToProcess = [];
  const errors = [];

  // 1. Cargar catálogos base para búsquedas rápidas
  const [areas, users] = await Promise.all([
    prisma.area.findMany({ include: { departamento: true } }),
    prisma.user.findMany(),
  ]);

  const clean = (txt) => txt ? txt.toString().trim() : "";
  const cleanLower = (txt) => clean(txt).toLowerCase();

  // Mapas en memoria
  // Mapear por usuario_login (Identificador principal para asignación)
  const userLoginMap = new Map(users
    .filter(i => i.usuario_login) // Solo usuarios que tengan un login definido
    .map(i => [cleanLower(i.usuario_login), i.id])
  );
  // Mapa secundario para compatibilidad, usando el nombre
  const userNameMap = new Map(users.map(i => [cleanLower(i.nombre), i.id]));
  
  const areaMap = new Map();
  areas.forEach(a => {
    // Clave compuesta: "nombreArea|nombreDepto"
    areaMap.set(`${cleanLower(a.nombre)}|${cleanLower(a.departamento?.nombre)}`, a.id);
  });

  // 2. Mapear Encabezados Dinámicamente (Fila 1)
  const headerMap = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headerMap[cleanLower(cell.value)] = colNumber;
  });
  
  // Helper para convertir cadena de fecha a formato ISO o null
  const parseDateForPrisma = (dateStr) => {
      if (!dateStr) return null;
      try {
          const date = new Date(dateStr);
          // Si la fecha es válida, la devuelve como ISO string, si no, null
          return isNaN(date.getTime()) ? null : date.toISOString();
      } catch (e) {
          return null;
      }
  };


  // 3. Leer Filas y Preparar Datos
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    // Helper para obtener valor por nombre de columna
    const getVal = (key) => {
      const idx = headerMap[key];
      return idx ? row.getCell(idx).text?.trim() : null;
    };

    // --- Extracción de Datos (con variantes de nombres de columna) ---
    const etiqueta = getVal('etiqueta');
    
    const nombreRaw = getVal('nombre equipo') || getVal('nombre');
    const serieRaw = getVal('n° serie') || getVal('serie') || getVal('numero serie') || getVal('serial');
    
    // Catálogos
    const tipoStr = getVal('tipo');
    const estadoStr = getVal('estado');
    
    // Sistema Operativo
    const rawOS = getVal('sistema operativo') || getVal('so') || getVal('os');
    let osStr = null;
    if (rawOS) {
        const trimmed = rawOS.trim().toLowerCase();
        osStr = trimmed.charAt(0).toUpperCase() + trimmed.slice(1); 
    }

    const marca = getVal('marca') || "Genérico";
    const modelo = getVal('modelo') || "Genérico";
    
    // IP: DHCP si está vacío
    const ip_equipo_raw = getVal('ip') || getVal('ip equipo');
    const ip_equipo = ip_equipo_raw || "DHCP";
    
    // Descripción: "" si está vacía
    const descripcion = getVal('descripcion') || ""; 
    
    // Office
    const officeVersionStr = getVal('version office') || getVal('office version') || getVal('version de office') || getVal('office versión');
    const officeLicenseTypeStr = getVal('tipo licencia') || getVal('tipo de licencia') || getVal('licencia office') || getVal('tipo licencia office') || getVal('tipo de licencia office');
    
    // Garantía
    const garantiaNumProdStr = getVal('n producto') || getVal('garantia numero producto') || getVal('numero de producto de garantia') || getVal('garantia numero');
    const garantiaInicioStr = getVal('inicio garantia') || getVal('garantia inicio');
    const garantiaFinStr = getVal('fin garantia') || getVal('garantia fin');

    // Detección de Panda (El encabezado "Panda" es cubierto por getVal('panda'))
    const pandaStr = getVal('antivirus') || getVal('panda') || getVal('es panda');
    const es_panda = cleanLower(pandaStr) === "si" || cleanLower(pandaStr) === "yes" || cleanLower(pandaStr) === "verdadero" || cleanLower(pandaStr) === "true";


    // Asignación de Usuario (prioridad por login)
    const responsableLoginStr = getVal('usuario de login') || getVal('usuario login') || getVal('login') || getVal('usuarios') || getVal('usuario');
    const responsableNameStr = getVal('responsable (jefe') || getVal('responsable');
    
    const perfilesStr = getVal('perfiles acceso') || getVal('perfiles') || getVal('perfiles de usuario');
    
    const areaStr = getVal('área') || getVal('area');
    const deptoStr = getVal('departamento');

    // --- Valores por Defecto ---
    const nombre_equipo = nombreRaw || `Equipo Fila ${rowNumber}`;
    const numero_serie = serieRaw || `SN-GEN-${rowNumber}-${Date.now().toString().slice(-4)}`;

    // Resolver IDs existentes
    let usuarioId = null;
    
    // 1. Intentar por Login (prioridad)
    if (responsableLoginStr) {
        usuarioId = userLoginMap.get(cleanLower(responsableLoginStr));
    }
    
    // 2. Si no se encuentra, intentar por Nombre (retrocompatibilidad)
    if (!usuarioId && responsableNameStr) {
        usuarioId = userNameMap.get(cleanLower(responsableNameStr));
    }


    let areaId = null;
    if (areaStr && deptoStr) {
      areaId = areaMap.get(`${cleanLower(areaStr)}|${cleanLower(deptoStr)}`);
    }
    // Fallback: buscar solo por nombre de área
    if (!areaId && areaStr) {
      const possibleArea = areas.find(a => cleanLower(a.nombre) === cleanLower(areaStr));
      if (possibleArea) areaId = possibleArea.id;
    }

    // Empaquetar para la siguiente fase
    devicesToProcess.push({
      deviceData: {
        etiqueta: etiqueta || null,
        nombre_equipo,
        numero_serie,
        marca,
        modelo,
        ip_equipo: ip_equipo,
        descripcion, 
        perfiles_usuario: perfilesStr || null,
        usuarioId, 
        areaId,
        // CAMPOS DE OFFICE
        office_version: officeVersionStr || null,
        office_tipo_licencia: officeLicenseTypeStr || null,
        // CAMPOS DE GARANTÍA
        garantia_numero_producto: garantiaNumProdStr || null,
        garantia_inicio: parseDateForPrisma(garantiaInicioStr),
        garantia_fin: parseDateForPrisma(garantiaFinStr),
        es_panda: es_panda, // Campo de Panda añadido
      },
      meta: {
        tipo: tipoStr || "Estación",
        estado: estadoStr || "Activo",
        os: osStr
      }
    });
  });

  // 4. Procesamiento e Inserción (Creación de Catálogos al Vuelo)
  let successCount = 0;
  
  // Cachés locales para no consultar la BD repetidamente
  const typesCache = new Map();
  const statusCache = new Map();
  const osCache = new Map();

  // Función auxiliar: Busca o Crea en catálogo
  const getOrCreateCatalog = async (modelName, value, cache) => {
    if (!value) return null;
    const key = cleanLower(value);
    
    // 1. Buscar en caché local
    if (cache.has(key)) return cache.get(key);

    // 2. Buscar en BD
    let item = await prisma[modelName].findFirst({ where: { nombre: value } });
    
    // 3. Si no existe, CREAR
    if (!item) {
      try {
        item = await prisma[modelName].create({ data: { nombre: value } });
      } catch (e) {
        // Si falla (ej. condición de carrera), intentar buscar de nuevo
        item = await prisma[modelName].findFirst({ where: { nombre: value } });
      }
    }

    if (item) {
      cache.set(key, item.id);
      return item.id;
    }
    return null;
  };

  for (const item of devicesToProcess) {
    try {
      // A. Resolver o Crear Tipo
      const tipoId = await getOrCreateCatalog('deviceType', item.meta.tipo, typesCache);
      
      // B. Resolver o Crear Estado
      const estadoId = await getOrCreateCatalog('deviceStatus', item.meta.estado, statusCache);
      
      // C. Resolver o Crear Sistema Operativo
      const sistemaOperativoId = await getOrCreateCatalog('operatingSystem', item.meta.os, osCache);

      // Construir objeto final
      const finalData = {
        ...item.deviceData,
        tipoId: tipoId, 
        estadoId: estadoId,
        sistemaOperativoId: sistemaOperativoId 
      };

      // Upsert (Crear o Actualizar si la serie ya existe)
      const exists = await prisma.device.findUnique({ where: { numero_serie: finalData.numero_serie } });
      
      if (!exists) {
        await prisma.device.create({ data: finalData });
        successCount++;
      } else {
        await prisma.device.update({
          where: { id: exists.id },
          data: finalData
        });
        successCount++;
      }

    } catch (error) {
      errors.push(`Error procesando ${item.deviceData.nombre_equipo}: ${error.message}`);
    }
  }

  return { successCount, errors };
};

export const getExpiredWarrantyAnalysis = async (startDate, endDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    // 1. Encontrar todos los dispositivos activos cuya garantía haya expirado
    const devices = await prisma.device.findMany({
        where: {
            estado: { NOT: { nombre: "Baja" } },
            garantia_fin: {
                lt: today.toISOString() // Garantía Final es menor que hoy (expirada)
            }
        },
        include: {
            tipo: { select: { nombre: true } },
            maintenances: { // Incluimos todos los mantenimientos
                select: {
                    estado: true,
                    tipo_mantenimiento: true,
                    fecha_realizacion: true,
                },
                where: {
                    estado: 'realizado', // Solo nos interesan los que se realizaron
                    tipo_mantenimiento: 'Correctivo', // Y que sean correctivos
                    // Aplicar filtro de fecha SOLO a la fecha de realización
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
            garantia_fin: 'asc' // Ordenar por la que expiró primero
        }
    });

    return devices.map(d => {
        const correctives = d.maintenances.filter(m => 
             m.tipo_mantenimiento === 'Correctivo' && m.estado === 'realizado'
        );
        
        const lastCorrectiveDate = correctives.length > 0 
            ? correctives[0].fecha_realizacion 
            : null;
        
        // Cálculo de días expirados (siempre contra la fecha actual)
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
            // (Total Horas no se calcula en esta versión)
        };
    });
};