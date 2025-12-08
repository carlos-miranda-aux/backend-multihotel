import bcrypt from "bcryptjs"; 
import jwt from "jsonwebtoken";
import prisma from "../PrismaClient.js";
import { ROLES } from "../config/constants.js";
import ExcelJS from "exceljs";

// --- HELPER: SANITIZAR USUARIO ---
// Esta función elimina espacios y fuerza minúsculas
const sanitizeUsername = (text) => {
    if (!text) return "";
    return text.trim().toLowerCase().replace(/\s+/g, '');
};

// --- LOGIN ---
export const login = async (req, res, next) => {
  try {
    const { password } = req.body;
    
    // Aplicamos la misma limpieza al intentar loguear
    const identifier = sanitizeUsername(req.body.identifier);
    const cleanPassword = password ? password.trim() : "";
    
    console.log("\n========================================");
    console.log("🔍 [LOGIN] Usuario limpio:", identifier);

    const user = await prisma.userSistema.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
        deletedAt: null, 
      },
      include: { hotels: true }
    });

    if (!user) {
      console.log("❌ [LOGIN FALLO] Usuario no encontrado.");
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    
    if (!isMatch) {
      console.log("❌ [LOGIN FALLO] Password incorrecto.");
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol }, 
      process.env.JWT_SECRET || "secreto_super_seguro",
      { expiresIn: "60d" }
    );

    const { password: _, ...userWithoutPassword } = user;

    console.log("🚀 [LOGIN ÉXITO] Acceso concedido.");
    console.log("========================================\n");

    res.json({
      message: "Login exitoso",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("💥 [LOGIN ERROR]:", error);
    next(error);
  }
};

// --- CREAR USUARIO ---
export const createUser = async (req, res, next) => {
  try {
    const { nombre, rol, hotelIds } = req.body; 
    
    // 🔥 LIMPIEZA AGRESIVA
    // " Juan Perez " -> "juanperez"
    const username = sanitizeUsername(req.body.username);
    const email = req.body.email ? req.body.email.trim() : "";
    const cleanPassword = req.body.password ? req.body.password.trim() : "";

    console.log(`🔵 [CREAR] Usuario final: '${username}'`);

    if (username.length < 3) {
        return res.status(400).json({ error: "El usuario debe tener al menos 3 caracteres." });
    }

    const existing = await prisma.userSistema.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res.status(400).json({ error: "El correo o usuario ya existe." });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    let hotelsConnect = [];
    if (hotelIds && Array.isArray(hotelIds)) {
        hotelsConnect = hotelIds.map(id => ({ id: Number(id) }));
    }

    const newUser = await prisma.userSistema.create({
      data: {
        nombre, 
        email, 
        username, // Se guarda limpio
        password: hashedPassword, 
        rol: rol || "HOTEL_GUEST",
        hotels: { connect: hotelsConnect }
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

// --- EDITAR USUARIO ---
export const updateUserController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, rol, hotelIds, password } = req.body;
        
        // 🔥 LIMPIEZA AGRESIVA EN EDICIÓN TAMBIÉN
        const username = sanitizeUsername(req.body.username);
        const email = req.body.email ? req.body.email.trim() : "";

        const existing = await prisma.userSistema.findUnique({ where: { id: Number(id) } });
        if(!existing) return res.status(404).json({error: "Usuario no existe"});

        let updateData = { nombre, email, username, rol };

        if (password && password.trim() !== "") {
            const cleanPass = password.trim();
            console.log(`🔐 [UPDATE] Reseteando password para ID ${id}.`);
            updateData.password = await bcrypt.hash(cleanPass, 10);
        }
        
        if (hotelIds && Array.isArray(hotelIds)) {
            updateData.hotels = {
                set: [], 
                connect: hotelIds.map(hId => ({ id: Number(hId) })) 
            };
        }

        const updatedUser = await prisma.userSistema.update({
            where: { id: Number(id) },
            data: updateData,
            include: { hotels: true }
        });

        const { password: _, ...rest } = updatedUser;
        res.json(rest);
    } catch (error) {
        next(error);
    }
}

// ... (Resto de funciones: updatePassword, getUsers, getUser, deleteUser, exportSystemUsers SE MANTIENEN IGUAL)
export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.trim() === "") return res.status(400).json({ error: "Contraseña requerida" });
    const cleanPass = password.trim();
    const hashedPassword = await bcrypt.hash(cleanPass, 10);
    await prisma.userSistema.update({ where: { id: Number(id) }, data: { password: hashedPassword } });
    res.json({ message: "Contraseña actualizada" });
  } catch (error) { res.status(500).json({ error: "Error al actualizar contraseña" }); }
};

export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "", sortBy = "nombre", order = "asc" } = req.query;
    const skip = (page - 1) * limit;
    const whereClause = { deletedAt: null, OR: [{ nombre: { contains: search } }, { username: { contains: search } }, { email: { contains: search } }] };
    if (req.user.hotelId) whereClause.hotels = { some: { id: req.user.hotelId } };
    const [users, totalCount] = await Promise.all([
        prisma.userSistema.findMany({ where: whereClause, skip: Number(skip), take: Number(limit), orderBy: { [sortBy]: order }, include: { hotels: true } }),
        prisma.userSistema.count({ where: whereClause })
    ]);
    res.json({ data: users.map(u => { const { password, ...rest } = u; return rest; }), totalCount });
  } catch (error) { next(error); }
};

export const getUser = async (req, res, next) => {
    try {
        const user = await prisma.userSistema.findUnique({ where: { id: Number(req.params.id) }, include: { hotels: true } });
        if(!user) return res.status(404).json({error: "No encontrado"});
        const { password, ...rest } = user;
        res.json(rest);
    } catch (error) { next(error); }
}

export const deleteUser = async (req, res, next) => {
    try { await prisma.userSistema.update({ where: { id: Number(req.params.id) }, data: { deletedAt: new Date() } }); res.json({ message: "Eliminado" }); } catch (error) { next(error); }
}

export const exportSystemUsers = async (req, res, next) => {
    try {
        const users = await prisma.userSistema.findMany({ where: { deletedAt: null }, include: { hotels: true } });
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Usuarios");
        worksheet.columns = [{ header: "ID", key: "id" }, { header: "Nombre", key: "nombre" }, { header: "Usuario", key: "username" }];
        users.forEach(u => worksheet.addRow(u));
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");
        await workbook.xlsx.write(res); res.end();
    } catch (error) { next(error); }
};