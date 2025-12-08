import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import { DEVICE_STATUS, ROLES } from "../config/constants.js";

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

];

const CATALOGS = {
    types: ["Laptop", "Estación", "Servidor", "AIO"],
    os: ["Windows 11", "Windows 10", "Windows 7", "Windows Server 2019", "Windows Server 2016"],
    statuses: Object.values(DEVICE_STATUS) 
};

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
    },
    {
        depto: "Golden Shores",
        areas: ["Golden Shores"]
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
                update: {},
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
        
        const rootUser = await prisma.userSistema.findUnique({ where: { username: "root" } });
        
        if (!rootUser) {
            const hashedPassword = await bcrypt.hash("root", 10);
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
    } catch (error) {
        console.error(error);
    }
};