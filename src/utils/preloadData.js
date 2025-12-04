// src/utils/preloadData.js
import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import { DEVICE_STATUS, ROLES } from "../config/constants.js";

// --- CONFIGURACIÓN DE DATOS INICIALES ---

// 1. Lista de Hoteles (Tenants)
const HOTELS_LIST = [
    { 
        nombre: "Crown Paradise Cancún", 
        codigo: "CPC-CUN", 
        direccion: "Blvd. Kukulcan Km 18.5, Zona Hotelera, Cancún" 
    },
    { 
        nombre: "Sensira", 
        codigo: "CPC-SEN", 
        direccion: "Blvd. Kukulcan Km 18.5, Zona Hotelera, Cancún" 
    },
    // Puedes agregar Vallarta u otros aquí en el futuro
    // { nombre: "Crown Paradise Club Puerto Vallarta", codigo: "CPC-PVR", ... }
];

// 2. Catálogos Maestros (Globales)
const CATALOGS = {
    types: ["Laptop", "Estación", "Servidor", "AIO"],
    os: ["Windows 11", "Windows 10", "Windows 7", "Windows Server 2019", "Windows Server 2016"],
    // Usamos los valores del objeto DEVICE_STATUS importado
    statuses: Object.values(DEVICE_STATUS) 
};

// 3. Departamentos y Áreas "Estándar"
// (Se crearán en todos los hoteles de la lista inicial)
const STANDARD_STRUCTURE = [
    { 
        depto: "Gerencia General", 
        areas: ["Gerencia General"] 
    },
    { 
        depto: "Capital Humano", 
        areas: ["Capital Humano"] 
    },
    { 
        depto: "Contraloría", 
        areas: ["Contabilidad", "Compras", "Almacén", "Costos", "Sistemas"] 
    },
    { 
        depto: "División Cuartos", 
        areas: ["Recepción", "Ama de Llaves", "Seguridad", "Teléfonos", "Concierge", "Áreas Públicas"] 
    },
    { 
        depto: "Mantenimiento", 
        areas: ["Mantenimiento"] 
    },
    {
        depto: "Alimentos y Bebidas",
        areas: ["Alimentos y Bebidas"]
    },
    {
        depto: "Animación y Deportes",
        areas: ["Animación y Deportes"]
    },
    {
        depto: "Ventas",
        areas: ["Ventas", "Reservaciones"]
    }
];

export const preloadMasterData = async () => {
    console.log("Iniciando Inicialización del Sistema (Seed)...");

    try {
        // A. CARGA DE CATÁLOGOS GLOBALES
        console.log("⚙️  Sincronizando Catálogos Maestros...");
        
        await Promise.all([
            ...CATALOGS.types.map(nombre => prisma.deviceType.upsert({ where: { nombre }, update: {}, create: { nombre } })),
            ...CATALOGS.os.map(nombre => prisma.operatingSystem.upsert({ where: { nombre }, update: {}, create: { nombre } })),
            ...CATALOGS.statuses.map(nombre => prisma.deviceStatus.upsert({ where: { nombre }, update: {}, create: { nombre } }))
        ]);

        // B. CREACIÓN DE HOTELES Y SU ESTRUCTURA
        console.log("Verificando Hoteles y Áreas...");

        for (const hotelData of HOTELS_LIST) {
            // 1. Crear/Actualizar Hotel
            const hotel = await prisma.hotel.upsert({
                where: { codigo: hotelData.codigo },
                update: {},
                create: { ...hotelData, activo: true }
            });

            // 2. Crear Estructura Base para este Hotel (Deptos y Áreas)
            for (const group of STANDARD_STRUCTURE) {
                // Crear Departamento vinculado al Hotel
                const depto = await prisma.department.upsert({
                    where: { 
                        nombre_hotelId: { nombre: group.depto, hotelId: hotel.id } 
                    },
                    update: {},
                    create: { nombre: group.depto, hotelId: hotel.id }
                });

                // Crear Áreas vinculadas al Departamento y Hotel
                for (const areaName of group.areas) {
                    await prisma.area.upsert({
                        where: {
                            nombre_departamentoId_hotelId: { 
                                nombre: areaName, 
                                departamentoId: depto.id, 
                                hotelId: hotel.id 
                            }
                        },
                        update: {},
                        create: {
                            nombre: areaName,
                            departamentoId: depto.id,
                            hotelId: hotel.id
                        }
                    });
                }
            }
            console.log(`   > Configurado: ${hotel.nombre}`);
        }

        // C. CREACIÓN DEL SUPER USUARIO (ROOT)
        console.log("Verificando Super Admin...");
        
        const rootUser = await prisma.userSistema.findUnique({ where: { username: "root" } });
        
        if (!rootUser) {
            const hashedPassword = await bcrypt.hash("root", 10); // ⚠️ Cambiar en producción
            await prisma.userSistema.create({
                data: {
                    username: "root",
                    email: "admin@simet.com",
                    password: hashedPassword,
                    nombre: "Root",
                    rol: ROLES.ROOT,
                    hotelId: null // Acceso Global
                }
            });
            console.log("✅ Usuario ROOT creado con éxito.");
            console.log("   User: root | Pass: root");
        } else {
            console.log("ℹ️  Usuario ROOT ya existe.");
        }

        console.log("✨  Precarga finalizada correctamente.");

    } catch (error) {
        console.error("❌ Error CRÍTICO en precarga:", error);
    }
};