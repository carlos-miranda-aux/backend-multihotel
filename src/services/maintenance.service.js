// src/services/maintenance.service.js
import prisma from "../../src/PrismaClient.js";

// 👈 CORRECCIÓN: 'getMaintenances' ahora acepta 'where'
export const getMaintenances = async ({ skip, take, where }) => {
  
  const [maintenances, totalCount] = await prisma.$transaction([
    prisma.maintenance.findMany({
      where: where, // Usa la cláusula 'where' que viene del controlador
      include: {
        device: { // Incluir el dispositivo...
          select: { // ...pero solo los campos necesarios
            id: true,
            etiqueta: true,
            nombre_equipo: true,
            numero_serie: true,
            // 👇 NUEVO: Incluir IP
            ip_equipo: true, // <-- AÑADIDO
            // 👈 Incluir el usuario del dispositivo
            usuario: { 
              select: { 
                nombre: true, 
                usuario_login: true // <-- AÑADIDO
              } 
            },
            // 👇 CORRECCIÓN CLAVE: Incluir Área y su Departamento para el reporte de lista
            area: { 
              select: { 
                nombre: true, 
                departamento: { 
                  select: { 
                    nombre: true 
                  } 
                } 
              } 
            }
          }
        }
      },
      skip: skip,
      take: take,
      orderBy: {
        fecha_programada: 'desc'
      }
    }),
    prisma.maintenance.count({
      where: where // Usa la misma cláusula 'where' para contar
    })
  ]);

  return { maintenances, totalCount };
};
// --- El resto de funciones (sin cambios) ---

export const getMaintenanceById = (id) =>
  prisma.maintenance.findUnique({
    where: { id: Number(id) },
    include: {
      device: { // La relación es Device -> Area -> Departamento
        include: {
          usuario: true,
          area: { // Usar la relación 'area'
            include: {
              departamento: true // Y luego incluir el departamento
            }
          },
          tipo: true,
        },
      },
    },
  });

export const createMaintenance = (data) =>
  prisma.maintenance.create({ data });

export const updateMaintenance = (id, data) =>
  prisma.maintenance.update({
    where: { id: Number(id) },
    data,
  });

export const deleteMaintenance = (id) =>
  prisma.maintenance.delete({
    where: { id: Number(id) },
  });