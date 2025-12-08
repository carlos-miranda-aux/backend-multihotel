import bcrypt from "bcryptjs"; 
import jwt from "jsonwebtoken";
import prisma from "../PrismaClient.js";
import { ROLES } from "../config/constants.js";
import ExcelJS from "exceljs";

// --- HELPER: SANITIZAR USUARIO ---
const sanitizeUsername = (text) => {
    if (!text) return "";
    return text.trim().toLowerCase().replace(/\s+/g, '');
};

// --- LOGIN ---
export const login = async (req, res, next) => {
  try {
    const { password } = req.body;
    
    // Limpieza de datos
    const identifier = sanitizeUsername(req.body.identifier);
    const cleanPassword = password ? password.trim() : "";
    
    // 1. Buscar usuario
    const user = await prisma.userSistema.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
        deletedAt: null, 
      },
      include: { hotels: true }
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 2. Verificar password
    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 3. Generar token
    const token = jwt.sign(
      { id: user.id, rol: user.rol }, 
      process.env.JWT_SECRET || "secreto_super_seguro",
      { expiresIn: "60d" }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login exitoso",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    next(error); // Pasa el error al middleware de manejo de errores
  }
};

// --- CREAR USUARIO ---
export const createUser = async (req, res, next) => {
  try {
    const { nombre, rol, hotelIds } = req.body; 
    
    const username = sanitizeUsername(req.body.username);
    const email = req.body.email ? req.body.email.trim() : "";
    const cleanPassword = req.body.password ? req.body.password.trim() : "";

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
        username,
        password: hashedPassword, 
        rol: rol || "HOTEL_GUEST",
        hotels: { connect: hotelsConnect }
      },
    });

    const { password: _, ...createdUser } = newUser;
    res.status(201).json(createdUser);
  } catch (error) {
    next(error);
  }
};

// --- EDITAR USUARIO ---
export const updateUserController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, rol, hotelIds, password } = req.body;
        
        const username = sanitizeUsername(req.body.username);
        const email = req.body.email ? req.body.email.trim() : "";

        const existing = await prisma.userSistema.findUnique({ where: { id: Number(id) } });
        if(!existing) return res.status(404).json({error: "Usuario no existe"});

        let updateData = { nombre, email, username, rol };

        if (password && password.trim() !== "") {
            const cleanPass = password.trim();
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

// --- ACTUALIZAR PASSWORD ---
export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.trim() === "") {
      return res.status(400).json({ error: "La contraseña es obligatoria." });
    }

    const cleanPass = password.trim();

    const requestingUser = req.user; 
    const isSelf = requestingUser.id === Number(id);
    const isAdmin = [ROLES.ROOT, ROLES.HOTEL_ADMIN].includes(requestingUser.rol);

    if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: "No tienes permiso para cambiar esta contraseña." });
    }

    const hashedPassword = await bcrypt.hash(cleanPass, 10);

    await prisma.userSistema.update({
      where: { id: Number(id) },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    next(error);
  }
};

// ... (El resto de funciones: getUsers, getUser, deleteUser, exportSystemUsers se mantienen igual, ya estaban limpias)
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