import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import { DEVICE_STATUS, ROLES } from "../config/constants.js";

const HOTELS_LIST = [
    { 
        nombre: "Crown Paradise Cancún", 
        codigo: "CPC-CUN", 
        direccion: "Blvd. Kukulcan Km 18.5, Zona Hotelera", 
        ciudad: "Cancún, Quintana Roo",
        razonSocial: "HOTELERA CANCO S.A. DE C.V.",
        diminutivo: "CANCO"
    },
    { 
        nombre: "Sensira", 
        codigo: "CPC-SEN", 
        direccion: "Carretera Cancún-Tulum Km 27.5", 
        ciudad: "Puerto Morelos, Quintana Roo",
        razonSocial: "OPERADORA SENSIRA S.A. DE C.V.", 
        diminutivo: "SENSIRA"
    },
];

const CATALOGS = {
    types: ["Laptop", "Estación", "Servidor", "AIO", "Impresora", "Tablet", "Celular", "Cámara"], 
    os: ["Windows 11", "Windows 10", "Windows 7", "Windows Server 2019", "Windows Server 2016", "Android", "iOS", "MacOS"],
    statuses: Object.values(DEVICE_STATUS) 
};

const STANDARD_STRUCTURE = [
    { 
        depto: "Gerencia General", 
        areas: ["Gerencia General", "General"] 
    },
    { 
        depto: "Capital Humano", 
        areas: ["Capital Humano"] 
    },
    { 
        depto: "Contraloría", 
        areas: ["Contabilidad", "Compras", "Almacén", "Costos", "Sistemas", "Contraloria", "Ingresos","Calidad"] 
    },
    { 
        depto: "División Cuartos", 
        areas: ["Recepción", "Ama de Llaves", "Seguridad", "Teléfonos", "Concierge", "Áreas Públicas", "División Cuartos", "Lavandería"] 
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
    },
    {
        depto: "Golden Shores",
        areas: ["Golden Shores"]
    },
    {
        depto: "Spa",
        areas: ["Spa"]
    },
    {
        depto: "TI",
        areas: ["TI"]
    }
];

export const preloadMasterData = async () => {

    try {
        
        await Promise.all([
            ...CATALOGS.types.map(nombre => prisma.deviceType.upsert({ where: { nombre }, update: {}, create: { nombre } })),
            ...CATALOGS.os.map(nombre => prisma.operatingSystem.upsert({ where: { nombre }, update: {}, create: { nombre } })),
            ...CATALOGS.statuses.map(nombre => prisma.deviceStatus.upsert({ where: { nombre }, update: {}, create: { nombre } }))
        ]);

        for (const hotelData of HOTELS_LIST) {
            const hotel = await prisma.hotel.upsert({
                where: { codigo: hotelData.codigo },
                update: { 
                    direccion: hotelData.direccion,
                    ciudad: hotelData.ciudad,
                    razonSocial: hotelData.razonSocial,
                    diminutivo: hotelData.diminutivo
                },
                create: { ...hotelData, activo: true }
            });

            for (const group of STANDARD_STRUCTURE) {
                const depto = await prisma.department.upsert({
                    where: { 
                        nombre_hotelId: { nombre: group.depto, hotelId: hotel.id } 
                    },
                    update: {},
                    create: { nombre: group.depto, hotelId: hotel.id }
                });

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
        }
        
        // --- Usuario ROOT Original ---
        const rootUser = await prisma.userSistema.findUnique({ where: { username: "root" } });
        if (!rootUser) {
            const hashedPassword = await bcrypt.hash("MewtwoXY", 10);
            await prisma.userSistema.create({
                data: {
                    username: "root",
                    email: "admin@simet.com",
                    password: hashedPassword,
                    nombre: "Root",
                    rol: ROLES.ROOT,
                }
            });
        } 

        // Usuario SOPORTE (Global)
        const supportUser = await prisma.userSistema.findUnique({ where: { username: "soporte" } });
        if (!supportUser) {
            const hashedPasswordSupport = await bcrypt.hash("Arrvia.25", 10);
            await prisma.userSistema.create({
                data: {
                    username: "soporte",
                    email: "soporte@simet.com",
                    password: hashedPasswordSupport,
                    nombre: "Soporte",
                    rol: ROLES.ROOT, // Se asigna ROOT para que tenga permisos de edición global
                }
            });
        }
        
    } catch (error) {
        console.error(error);
    }
};