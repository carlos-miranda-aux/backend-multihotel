// src/services/user.service.js
import prisma from "../../src/PrismaClient.js";
import ExcelJS from "exceljs";

// --- Funciones CRUD normales (Sin cambios) ---
export const getUsers = async ({ skip, take, search }) => {
  const whereClause = search ? {
    OR: [
      { nombre: { contains: search } },
      { correo: { contains: search } },
      { usuario_login: { contains: search } }
    ]
  } : {};

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      where: whereClause,
      include: { 
        area: { include: { departamento: true } } 
      },
      skip: skip,
      take: take,
      orderBy: { nombre: 'asc' }
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

// --- IMPORTACIÓN "ACEPTAR TODO" ---
export const importUsersFromExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);

  const usersToCreate = [];
  const errors = []; // Se usará solo para errores críticos de BD, no de validación

  // 1. Cargar Áreas
  const areas = await prisma.area.findMany({
    include: { departamento: true }
  });

  const clean = (txt) => txt ? txt.toString().trim().toLowerCase() : "";

  const areaMap = new Map();
  areas.forEach(a => {
    const key = `${clean(a.nombre)}|${clean(a.departamento?.nombre)}`;
    areaMap.set(key, a.id);
  });

  // 2. Mapear Encabezados
  const headerMap = {};
  const headerRow = worksheet.getRow(1);
  
  headerRow.eachCell((cell, colNumber) => {
      const headerText = clean(cell.value);
      headerMap[headerText] = colNumber;
  });

  // 3. Leer filas
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; 

    const getVal = (key) => {
        const colIdx = headerMap[key];
        if (!colIdx) return null; 
        return row.getCell(colIdx).text?.trim();
    };

    // Buscar valores
    // Si NO hay nombre, ponemos un placeholder para que no falle la BD
    const nombreRaw = getVal('nombre');
    const nombre = nombreRaw || `Usuario Sin Nombre Fila ${rowNumber}`; 

    const correo = getVal('correo') || getVal('email');
    const areaNombre = getVal('área') || getVal('area'); 
    const deptoNombre = getVal('departamento') || getVal('depto');
    const usuario_login = getVal('usuario de login') || getVal('usuario') || getVal('login');
    const esJefeRaw = getVal('es jefe') || getVal('jefe') || getVal('es jefe de area');

    // Lógica "Es Jefe"
    const es_jefe_de_area = clean(esJefeRaw) === "si" || clean(esJefeRaw) === "yes" || clean(esJefeRaw) === "verdadero";

    // Buscar ID de Área
    let areaId = null;
    if (areaNombre && deptoNombre) {
      const key = `${clean(areaNombre)}|${clean(deptoNombre)}`;
      areaId = areaMap.get(key);
      
      if (!areaId) {
         const areasFound = areas.filter(a => clean(a.nombre) === clean(areaNombre));
         if (areasFound.length === 1) areaId = areasFound[0].id;
      }
    }

    usersToCreate.push({
      nombre, // Siempre tendrá valor
      correo: correo || null, // Permitimos null
      areaId,
      usuario_login: usuario_login || null,
      es_jefe_de_area
    });
  });

  // 4. Insertar / Actualizar
  let successCount = 0;
  for (const u of usersToCreate) {
    try {
      // Usamos findFirst porque 'nombre' no es unique en el schema, pero queremos evitar duplicados lógicos
      const existing = await prisma.user.findFirst({ where: { nombre: u.nombre } });
      
      if (!existing) {
          await prisma.user.create({ data: u });
          successCount++;
      } else {
          // Actualizamos datos (por si cambió el área o el status de jefe)
          await prisma.user.update({
              where: { id: existing.id },
              data: u
          });
          successCount++;
      }
    } catch (error) {
      errors.push(`Error BD en fila ${u.nombre}: ${error.message}`);
    }
  }

  return { successCount, errors };
};