// src/utils/preloadData.js
import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import { DEVICE_STATUS } from "../config/constants.js";

export const preloadMasterData = async () => {
    console.log("🔄 Iniciando precarga de datos maestros (Multi-Hotel)...");

    try {
        // --------------------------------------------------------
        // 1. CREAR EL HOTEL POR DEFECTO (TENANT 1)
        // --------------------------------------------------------
        console.log("🏨 Verificando Hotel Principal...");
        
        // Usamos upsert para no duplicar si se corre el script varias veces
        const mainHotel = await prisma.hotel.upsert({
            where: { codigo: "CPC-CUN" },
            update: {},
            create: {
                nombre: "Crown Paradise Club Cancún",
                codigo: "CPC-CUN",
                direccion: "Blvd. Kukulcan Km 18.5, Zona Hotelera, Cancún",
                activo: true
            }
        });
        
        console.log(`✅ Hotel activo: ${mainHotel.nombre} (ID: ${mainHotel.id})`);

        // --------------------------------------------------------
        // 2. CATÁLOGOS GLOBALES (Estándares para todos los hoteles)
        // --------------------------------------------------------
        console.log("⚙️ Cargando catálogos globales...");

        const DEVICE_TYPES = ["Laptop", "Estación", "Servidor", "AIO", "Impresora", "Tablet"];
        await Promise.all(DEVICE_TYPES.map(nombre => 
            prisma.deviceType.upsert({ where: { nombre }, update: {}, create: { nombre } })
        ));

        // Estados del equipo
        const DEVICE_STATUSES = [DEVICE_STATUS.ACTIVE, DEVICE_STATUS.DISPOSED, "En Reparación", "Stock"];
        await Promise.all(DEVICE_STATUSES.map(nombre => 
            prisma.deviceStatus.upsert({ where: { nombre }, update: {}, create: { nombre } })
        ));

        // Sistemas Operativos
        const OS_LIST = ["Windows 11", "Windows 10", "Windows 7", "Windows Server 2019", "Windows Server 2016", "macOS", "Linux"];
        await Promise.all(OS_LIST.map(nombre => 
            prisma.operatingSystem.upsert({ where: { nombre }, update: {}, create: { nombre } })
        ));

        // --------------------------------------------------------
        // 3. ESTRUCTURA DEL HOTEL (Deptos y Áreas)
        // --------------------------------------------------------
        console.log("Kd🏗️ Construyendo estructura organizacional del hotel...");

        const DEPARTMENTS = [
            "Gerencia General", "Capital Humano", "Mantenimiento", "Contraloría",
            "Ventas", "Alimentos y Bebidas", "Animación y Deportes", "División Cuartos",
            "Spa", "Golden Shores", "TI"
        ];

        let deptMap = {};

        for (const nombre of DEPARTMENTS) {
            // Nota: Ahora buscamos por nombre Y hotelId
            const dept = await prisma.department.upsert({
                where: { 
                    nombre_hotelId: { nombre: nombre, hotelId: mainHotel.id } // Clave compuesta única
                },
                update: {},
                create: { 
                    nombre, 
                    hotelId: mainHotel.id 
                }
            });
            deptMap[dept.nombre] = dept.id;
        }

        const AREAS = [
            { nombre: "Sistemas", deptoName: "Contraloría" },
            { nombre: "Contabilidad", deptoName: "Contraloría" },
            { nombre: "Compras", deptoName: "Contraloría" },
            { nombre: "Almacén", deptoName: "Contraloría" },
            { nombre: "Recepción", deptoName: "División Cuartos" },
            { nombre: "Ama de Llaves", deptoName: "División Cuartos" },
            { nombre: "Capital Humano", deptoName: "Capital Humano" },
            { nombre: "Gerencia General", deptoName: "Gerencia General" },
            // ... agrega más según necesites
        ];

        for (const area of AREAS) {
            const deptId = deptMap[area.deptoName];
            if (deptId) {
                await prisma.area.upsert({
                    where: {
                        nombre_departamentoId_hotelId: { // Clave compuesta del Area
                            nombre: area.nombre,
                            departamentoId: deptId,
                            hotelId: mainHotel.id
                        }
                    },
                    update: {},
                    create: {
                        nombre: area.nombre,
                        departamentoId: deptId,
                        hotelId: mainHotel.id
                    }
                });
            }
        }

        // --------------------------------------------------------
        // 4. USUARIOS DEL SISTEMA (LOGIN)
        // --------------------------------------------------------
        console.log("👤 Creando usuarios base...");

        // A) SUPER ADMIN (Global - Tú)
        // No tiene hotelId porque ve todo
        const superAdminExists = await prisma.userSistema.findUnique({ where: { username: "root" } });
        if (!superAdminExists) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await prisma.userSistema.create({
                data: {
                    username: "root",
                    email: "dev@simet.com",
                    password: hashedPassword,
                    nombre: "Super Admin (Dev)",
                    rol: "SUPER_ADMIN",
                    hotelId: null // Global
                }
            });
            console.log("✨ Usuario creado: root (Pass: admin123)");
        }

        // B) ADMIN DEL HOTEL (Jefe de Sistemas Local)
        // Vinculado al hotel CPC-CUN
        const hotelAdminExists = await prisma.userSistema.findUnique({ where: { username: "admin_cun" } });
        if (!hotelAdminExists) {
            const hashedPassword = await bcrypt.hash("crown123", 10);
            await prisma.userSistema.create({
                data: {
                    username: "admin_cun",
                    email: "sistemas.cun@crownparadise.com",
                    password: hashedPassword,
                    nombre: "Jefe Sistemas CUN",
                    rol: "HOTEL_ADMIN",
                    hotelId: mainHotel.id // Restringido a este hotel
                }
            });
            console.log("✨ Usuario creado: admin_cun (Pass: crown123)");
        }

        console.log("✅ Precarga finalizada con éxito.");

    } catch (error) {
        console.error("❌ Error en precarga:", error);
    }
};