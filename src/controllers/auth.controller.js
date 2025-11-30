import * as authService from "../services/auth.service.js";
import prisma from "../PrismaClient.js";
import ExcelJS from "exceljs";

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const data = await authService.loginUser({ identifier, password });
    res.json(data);
  } catch (err) {
    // Aquí podrías querer mantener el 400 explícito si el errorHandler no maneja "Usuario no encontrado"
    // Pero para ser consistentes con el patrón, lo pasamos:
    // (Asegúrate de que tu errorHandler maneje errores de login si quieres mensajes personalizados)
    res.status(400).json({ message: err.message }); 
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "nombre";
    const order = req.query.order || "asc";
    const skip = (page - 1) * limit;

    const { users, totalCount } = await authService.getUsers({ 
        skip, 
        take: limit, 
        sortBy, 
        order 
    });

    res.json({
      data: users,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (error) { 
    next(error); 
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userToDelete = await prisma.userSistema.findUnique({ where: { id: Number(req.params.id) } });
    if (!userToDelete) return res.status(404).json({ message: "Usuario no encontrado" });
    if (userToDelete.username === "superadmin") return res.status(403).json({ error: "No se puede eliminar al superadmin" });
    await authService.deleteUser(req.params.id);
    res.json({ message: "Usuario eliminado" });
  } catch (error) { 
    next(error); 
  }
};

export const updateUserController = async (req, res, next) => {
  try {
    const updatedUser = await authService.updateUser(req.params.id, req.body);
    res.json({ message: "Usuario actualizado", user: updatedUser });
  } catch (error) { 
    next(error); 
  }
};

export const createUser = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) { 
    next(error); 
  }
};

export const exportSystemUsers = async (req, res, next) => {
  try {
    const { users } = await authService.getUsers({ skip: 0, take: undefined }); 
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Usuarios del Sistema");
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Nombre", key: "nombre", width: 30 },
      { header: "Username", key: "username", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Rol", key: "rol", width: 15 },
    ];
    users.forEach((user) => {
      worksheet.addRow(user);
    });
    worksheet.getRow(1).font = { bold: true };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=usuarios_sistema.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { 
    next(error); 
  }
};