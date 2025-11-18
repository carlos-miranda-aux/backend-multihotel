// controllers/auth.controller.js
import * as authService from "../services/auth.service.js";
import prisma from "../PrismaClient.js";
import ExcelJS from "exceljs";

// ... (login - sin cambios) ...
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const data = await authService.loginUser({ identifier, password });
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// 👈 CORRECCIÓN: 'getUsers' ahora maneja paginación
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { users, totalCount } = await authService.getUsers({ skip, take: limit });

    res.json({
      data: users,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ... (getUser, deleteUser, updateUserController, createUser - sin cambios) ...
export const getUser = async (req, res) => {
  try {
    const user = await authService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userToDelete = await prisma.userSistema.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!userToDelete) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    if (userToDelete.username === "superadmin") {
      return res.status(403).json({ error: "No se puede eliminar al superadministrador" });
    }
    await authService.deleteUser(req.params.id);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserController = async (req, res) => {
  try {
    const userId = req.params.id;
    const oldUser = await prisma.userSistema.findUnique({
      where: { id: Number(userId) },
    });
    if (!oldUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const updatedUser = await authService.updateUser(userId, req.body);
    res.json({ message: "Usuario actualizado correctamente", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


export const exportSystemUsers = async (req, res) => {
  try {
    // 👈 CORRECCIÓN: Exportar no se pagina
    const { users } = await authService.getUsers({ skip: 0, take: undefined }); 
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Usuarios del Sistema");

    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Nombre Completo", key: "nombre", width: 30 },
      { header: "Username", key: "username", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Rol", key: "rol", width: 15 },
    ];

    users.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        email: user.email,
        rol: user.rol,
      });
    });

    worksheet.getRow(1).font = { bold: true };
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=usuarios_sistema.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al exportar usuarios del sistema" });
  }
};