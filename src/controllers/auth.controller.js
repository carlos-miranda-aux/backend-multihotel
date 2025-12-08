import bcrypt from "bcryptjs"; 
import jwt from "jsonwebtoken";
import prisma from "../PrismaClient.js";
import { ROLES } from "../config/constants.js";
import ExcelJS from "exceljs";

// Login de usuario
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    
    console.log("🔵 [LOGIN] Intentando ingresar con:", identifier);

    // 1. Buscar en la tabla CORRECTA: UserSistema
    const user = await prisma.userSistema.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
        deletedAt: null, 
      },
      include: {
        hotels: true, 
      }
    });

    if (!user) {
      console.log("🔴 [LOGIN] Fallo: Usuario NO encontrado en la base de datos.");
      return res.status(401).json({ error: "Credenciales inválidas (Usuario no existe)" });
    }

    console.log("🟢 [LOGIN] Usuario encontrado:", user.username);

    // 2. Verificar password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log("🔴 [LOGIN] Fallo: La contraseña NO coincide.");
      return res.status(401).json({ error: "Credenciales inválidas (Contraseña incorrecta)" });
    }

    // 3. Crear token
    const token = jwt.sign(
      { id: user.id, rol: user.rol }, 
      process.env.JWT_SECRET || "secreto_super_seguro",
      { expiresIn: "60d" }
    );

    const { password: _, ...userWithoutPassword } = user;

    console.log("✅ [LOGIN] Éxito. Token generado.");

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

// Crear usuario (Admin)
export const createUser = async (req, res, next) => {
  try {
    const { nombre, email, username, password, rol, hotelIds } = req.body; 

    console.log("🔵 [CREAR USUARIO] Creando:", username, "| Rol:", rol);

    const existing = await prisma.userSistema.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });
    if (existing) {
      return res.status(400).json({ error: "El correo o usuario ya existe." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let hotelsConnect = [];
    if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
        hotelsConnect = hotelIds.map(id => ({ id: Number(id) }));
    }

    // Guardar en UserSistema
    const newUser = await prisma.userSistema.create({
      data: {
        nombre,
        email,
        username,
        password: hashedPassword,
        rol: rol || "HOTEL_GUEST",
        hotels: {
            connect: hotelsConnect
        }
      },
    });

    console.log("✅ [CREAR USUARIO] Usuario creado con ID:", newUser.id);

    const { password: _, ...createdUser } = newUser;
    res.status(201).json(createdUser);
  } catch (error) {
    console.error("💥 [CREAR ERROR]:", error);
    next(error);
  }
};

// Obtener usuarios
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "", sortBy = "nombre", order = "asc" } = req.query;
    const skip = (page - 1) * limit;
    
    const whereClause = {
        deletedAt: null,
        OR: [
            { nombre: { contains: search } }, 
            { username: { contains: search } },
            { email: { contains: search } }
        ]
    };

    const [users, totalCount] = await Promise.all([
        prisma.userSistema.findMany({
            where: whereClause,
            skip: Number(skip),
            take: Number(limit),
            orderBy: { [sortBy]: order },
            include: { hotels: true } 
        }),
        prisma.userSistema.count({ where: whereClause })
    ]);

    res.json({
      data: users.map(u => {
        const { password, ...rest } = u;
        return rest;
      }),
      totalCount
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await prisma.userSistema.findUnique({
            where: { id: Number(id) },
            include: { hotels: true }
        });
        if(!user) return res.status(404).json({error: "Usuario no encontrado"});
        
        const { password, ...rest } = user;
        res.json(rest);
    } catch (error) {
        next(error);
    }
}

// Actualizar usuario
export const updateUserController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, email, username, rol, hotelIds } = req.body;

        const existing = await prisma.userSistema.findUnique({ where: { id: Number(id) } });
        if(!existing) return res.status(404).json({error: "Usuario no existe"});

        let updateData = { nombre, email, username, rol };
        
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

export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.userSistema.update({
            where: { id: Number(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ message: "Usuario eliminado (Soft Delete)" });
    } catch (error) {
        next(error);
    }
}

export const exportSystemUsers = async (req, res, next) => {
    try {
        const users = await prisma.userSistema.findMany({
            where: { deletedAt: null },
            include: { hotels: true }
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Usuarios Sistema");

        worksheet.columns = [
            { header: "ID", key: "id", width: 10 },
            { header: "Nombre", key: "nombre", width: 30 },
            { header: "Usuario", key: "username", width: 20 },
            { header: "Email", key: "email", width: 30 },
            { header: "Rol", key: "rol", width: 15 },
            { header: "Hoteles", key: "hotels", width: 40 },
        ];

        users.forEach((u) => {
            worksheet.addRow({
                id: u.id,
                nombre: u.nombre,
                username: u.username,
                email: u.email,
                rol: u.rol,
                hotels: u.hotels.map(h => h.nombre).join(", ")
            });
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=usuarios_sistema.xlsx");

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

// Actualizar contraseña
export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "La contraseña es obligatoria." });
    }

    const requestingUser = req.user; 
    const isSelf = requestingUser.id === Number(id);
    const isAdmin = [ROLES.ROOT, ROLES.HOTEL_ADMIN].includes(requestingUser.rol);

    if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: "No tienes permiso para cambiar esta contraseña." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.userSistema.update({
      where: { id: Number(id) },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ error: "Error interno al actualizar la contraseña." });
  }
};