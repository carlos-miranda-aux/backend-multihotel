import prisma from "../PrismaClient.js";
import bcrypt from "bcryptjs";
import { DEVICE_STATUS, ROLES } from "../config/constants.js";
import dotenv from "dotenv";

// 1. CATÁLOGOS GLOBALES (No dependen de ningún hotel)
const CATALOGS = {
    types: ["Laptop", "Estación", "Servidor", "AIO", "Impresora", "Tablet", "Celular", "Cámara"],
    os: ["Windows 11", "Windows 10", "Windows 7", "Windows Server 2019", "Windows Server 2016", "Android", "iOS", "MacOS"],
    statuses: Object.values(DEVICE_STATUS)
};

// 2. PLANTILLA DE ESTRUCTURA
export const STANDARD_STRUCTURE_TEMPLATE = [
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
        areas: ["Contabilidad", "Compras", "Almacén", "Costos", "Sistemas", "Contraloria", "Ingresos", "Calidad", "Ingresos"]
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
        areas: ["Ventas", "Reservaciones", "Guest Experience"]
    },
    {
        depto: "Spa",
        areas: ["Spa"]
    },
    {
        depto: "TI",
        areas: ["TI", "Sistemas"]
    },
    {   depto: "Golden Shores",
        areas: ["Golden Shores"]
    }
];

export const preloadMasterData = async () => {
    try {
        // --- CARGA DE CATÁLOGOS GLOBALES ---
        // Usamos upsert para no duplicar si ya existen
        await Promise.all([
            ...CATALOGS.types.map(nombre => prisma.deviceType.upsert({ where: { nombre }, update: {}, create: { nombre } })),
            ...CATALOGS.os.map(nombre => prisma.operatingSystem.upsert({ where: { nombre }, update: {}, create: { nombre } })),
            ...CATALOGS.statuses.map(nombre => prisma.deviceStatus.upsert({ where: { nombre }, update: {}, create: { nombre } }))
        ]);

        // --- USUARIO ROOT (Super Admin) ---
        // Este es el único usuario que necesita existir sí o sí para empezar
        const rootUser = await prisma.userSistema.findUnique({ where: { username: "superuser" } });
        if (!rootUser) {
            const hashedPassword = await bcrypt.hash(process.env.ROOT_PASS, 10);
            
            await prisma.userSistema.create({
                data: {
                    username: "superuser",
                    email: "superuser@simet.com",
                    password: hashedPassword,
                    nombre: "Superusuario",
                    rol: ROLES.ROOT, // Acceso total
                }
            });
        }

        // --- USUARIO SOPORTE (Opcional, para emergencias globales) ---
        const supportUser = await prisma.userSistema.findUnique({ where: { username: "soporte" } });
        if (!supportUser) {
            const hashedPasswordSupport = await bcrypt.hash(process.env.SOPORTE_PASS, 10);
            await prisma.userSistema.create({
                data: {
                    username: "soporte",
                    email: "soporte@simet.com",
                    password: hashedPasswordSupport,
                    nombre: "Soporte",
                    rol: ROLES.ROOT, // Se asigna ROOT para dar mantenimiento global
                }
            });
        }

    } catch (error) {
        console.error("Error en preloadMasterData:", error);
    }
};