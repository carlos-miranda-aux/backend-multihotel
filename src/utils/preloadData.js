// src/utils/preloadData.js
import prisma from "../PrismaClient.js";

/*
 * Precarga datos maestros (Departamentos, Áreas, Tipos, Estados, SO)
 * si las tablas correspondientes están vacías.
 */
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
        "TI",     //aqui entra los equipos de business center, servidores y equipos de backup
    ];

    const deptCount = await prisma.department.count();
    let deptMap = {};

    // 1. Cargando Departamentos
    if (deptCount === 0) {
        console.log("Cargando Departamentos por defecto...");
        const depts = await Promise.all(
            DEPARTMENTS.map(nombre => prisma.department.create({ data: { nombre } }))
        );
        depts.forEach(d => deptMap[d.nombre] = d.id);
    } else {
        // Si ya existen, recuperar todos los IDs
        const existingDepts = await prisma.department.findMany({ 
            where: { nombre: { in: DEPARTMENTS } },
            select: { id: true, nombre: true }
        });
        existingDepts.forEach(d => deptMap[d.nombre] = d.id);
    }

    // 2. Cargando Áreas (Usando los IDs de deptMap)
    const areaCount = await prisma.area.count();
    if (areaCount === 0 && Object.keys(deptMap).length > 0) {
        console.log("Cargando Áreas por defecto...");

        const AREAS = [
            // Gerencia General
            { nombre: "Gerencia General", deptoName: "Gerencia General" },
            {nombre: "General", deptoName: "Gerencia General" },


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
            { nombre: "Contraloría", deptoName: "Contraloría" },

            
            // Ventas
            { nombre: "Ventas", deptoName: "Ventas" },
            { nombre: "Reservaciones", deptoName: "Ventas" },
            { nombre: "Experiencia al Huesped", deptoName: "Ventas" },
            //{ nombre: "Bodas", deptoName: "Ventas" },

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
            { nombre: "Bussiness Center", deptoName: "TI" },
            { nombre: "Servidores", deptoName: "TI" },
        ];

        await Promise.all(
            AREAS.filter(area => deptMap[area.deptoName]) // Asegura que el depto existe
                 .map(area => prisma.area.create({ 
                     data: { 
                         nombre: area.nombre, 
                         departamentoId: deptMap[area.deptoName] 
                     } 
                 }))
        );
    }
    
    // 3. Tipos de Dispositivo (Ajustado)
    const typeCount = await prisma.deviceType.count();
    if (typeCount === 0) {
        console.log("Cargando Tipos de Dispositivo por defecto...");
        await Promise.all([
            prisma.deviceType.create({ data: { nombre: "Laptop" } }),
            prisma.deviceType.create({ data: { nombre: "Estación" } }),
            prisma.deviceType.create({ data: { nombre: "Servidor" } }),
            prisma.deviceType.create({ data: { nombre: "AIO" } }),
        ]);
    }
    
    // 4. Estados de Dispositivo (Ajustado)
    const statusCount = await prisma.deviceStatus.count();
    if (statusCount === 0) {
        console.log("Cargando Estados de Dispositivo por defecto...");
        await Promise.all([
            prisma.deviceStatus.create({ data: { nombre: "Activo" } }),
            prisma.deviceStatus.create({ data: { nombre: "Baja" } }),
        ]);
    }
    
    // 5. Sistemas Operativos (Sin cambios)
    const osCount = await prisma.operatingSystem.count();
    if (osCount === 0) {
        console.log("Cargando Sistemas Operativos por defecto...");
        await Promise.all([
            prisma.operatingSystem.create({ data: { nombre: "Windows 11" } }),
            prisma.operatingSystem.create({ data: { nombre: "Windows 10" } }),
            prisma.operatingSystem.create({ data: { nombre: "Windows 7" } }),
            prisma.operatingSystem.create({ data: { nombre: "Windows Server 2019" } }),
        ]);
    }

    console.log("Precarga de datos maestros finalizada.");
}; 

///para que se vea camnbio