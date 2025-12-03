// src/utils/preloadData.js
import prisma from "../PrismaClient.js";
import { ROLES, DEVICE_STATUS } from "../config/constants.js"; // 👈 CONSTANTES

export const preloadMasterData = async () => {
    console.log("Iniciando precarga de datos maestros...");
    
    const DEPARTMENTS = [
        "Gerencia General", 
        "Capital Humano", 
        "Mantenimiento", 
        "Contraloría",
        "Ventas", 
        "Alimentos y Bebidas", 
        "Animación y Deportes", 
        "División Cuartos",
        "Spa", 
        "Golden Shores",
        "TI", 
    ];

    let deptMap = {};

    console.log("Verificando Departamentos...");
    for (const nombre of DEPARTMENTS) {
        const dept = await prisma.department.upsert({
            where: { nombre },
            update: {},
            create: { nombre }
        });
        deptMap[dept.nombre] = dept.id;
    }

    console.log("Verificando Áreas...");
    const AREAS = [
        // Gerencia General
        { nombre: "Gerencia General", deptoName: "Gerencia General" },

        // Recursos Humanos
        { nombre: "Capital Humano", deptoName: "Capital Humano" },

        // Mantenimiento
        { nombre: "Mantenimiento", deptoName: "Mantenimiento" },

        // Contraloría
        { nombre: "Sistemas", deptoName: "Contraloría" },
        { nombre: "Contabilidad", deptoName: "Contraloría" },
        { nombre: "Compras", deptoName: "Contraloría" },
        { nombre: "Almacén", deptoName: "Contraloría" },
        { nombre: "Costos", deptoName: "Contraloría" },
        { nombre: "Calidad", deptoName: "Contraloría" },

        // Ventas
        { nombre: "Ventas", deptoName: "Ventas" },
        { nombre: "Grupos", deptoName: "Ventas" },
        { nombre: "Reservaciones", deptoName: "Ventas" },
        { nombre: "Experiencia al Huesped", deptoName: "Ventas" },

        // Alimentos y Bebidas
        { nombre: "Alimentos y Bebidas", deptoName: "Alimentos y Bebidas" },

        // Animación y Deportes
        { nombre: "Animación y Deportes", deptoName: "Animación y Deportes" },

        // División Cuartos
        { nombre: "Recepción", deptoName: "División Cuartos" },
        { nombre: "Concierge", deptoName: "División Cuartos" },
        { nombre: "Ama de Llaves", deptoName: "División Cuartos" },
        { nombre: "Areas Publicas", deptoName: "División Cuartos" },
        { nombre: "Seguridad", deptoName: "División Cuartos" },
        { nombre: "Lavanderia", deptoName: "División Cuartos" },
        { nombre: "División Cuartos", deptoName: "División Cuartos" },
        { nombre: "Telefonos", deptoName: "División Cuartos" },

        // Spa
        { nombre: "Spa", deptoName: "Spa" },

        // Golden Shores
        { nombre: "Golden Shores", deptoName: "Golden Shores" },

        // TI
        { nombre: "Business Center", deptoName: "TI" },
        { nombre: "Servidores", deptoName: "TI" },
        { nombre: "Backup", deptoName: "TI" },
    ];

    for (const area of AREAS) {
        const deptId = deptMap[area.deptoName];
        if (deptId) {
            const existing = await prisma.area.findFirst({
                where: { 
                    nombre: area.nombre,
                    departamentoId: deptId
                }
            });

            if (!existing) {
                await prisma.area.create({
                    data: {
                        nombre: area.nombre,
                        departamentoId: deptId
                    }
                });
            }
        } else {
            console.warn(`⚠️ No se encontró el departamento '${area.deptoName}' para el área '${area.nombre}'`);
        }
    }
    
    console.log("Verificando Tipos de Dispositivo...");
    const DEVICE_TYPES = ["Laptop", "Estación", "Servidor", "AIO"];
    await Promise.all(
        DEVICE_TYPES.map(nombre => 
            prisma.deviceType.upsert({
                where: { nombre },
                update: {},
                create: { nombre }
            })
        )
    );
    
    console.log("Verificando Estados...");
    // 👇 USO DE CONSTANTES
    const DEVICE_STATUSES = [DEVICE_STATUS.ACTIVE, DEVICE_STATUS.DISPOSED];
    await Promise.all(
        DEVICE_STATUSES.map(nombre => 
            prisma.deviceStatus.upsert({
                where: { nombre },
                update: {},
                create: { nombre }
            })
        )
    );
    
    console.log("Verificando Sistemas Operativos...");
    const OS_LIST = ["Windows 11", "Windows 10", "Windows 7", "Windows Server", "Windows XP"];
    
    await Promise.all(
        OS_LIST.map(nombre => 
            prisma.operatingSystem.upsert({
                where: { nombre },
                update: {},
                create: { nombre }
            })
        )
    );

    // Crear SuperAdmin
    const superAdmin = await prisma.userSistema.findFirst({
      where: { username: "admin", rol: ROLES.ADMIN } // 👈 CONSTANTE
    });

    if (!superAdmin) {
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.default.hash("admin", 10);
      const user = await prisma.userSistema.create({
        data: {
          username: "admin",
          email: "admin@simet.cpc",
          password: hashedPassword,
          nombre: "Admin",
          rol: ROLES.ADMIN, // 👈 CONSTANTE
        },
      });
    } 
};