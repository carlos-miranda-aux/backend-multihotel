// src/controllers/user.controller.js
import * as userService from "../services/user.service.js";
import ExcelJS from "exceljs";

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limitParam = req.query.limit; 
    const limit = (limitParam === '0') ? 0 : (parseInt(limitParam) || 10);
    
    const sortBy = req.query.sortBy || "nombre";
    const order = req.query.order || "asc";
    
    const skip = (page - 1) * limit;

    // Si limit es 0, devolvemos todo (pero filtrado por el hotel del usuario)
    if (limit === 0) {
        const { users } = await userService.getUsers({ 
            skip: 0, 
            take: undefined, 
            sortBy, 
            order 
        }, req.user);
        return res.json(users);
    }

    const { users, totalCount } = await userService.getUsers({ skip, take: limit, search: req.query.search, sortBy, order }, req.user);

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

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers(req.user); 
    res.json(users); 
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user);
    if (!user) return res.status(404).json({ message: "User not found or access denied" });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    // El servicio asignará el hotel automáticamente basado en req.user
    const user = await userService.createUser(req.body, req.user);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user);
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
};

export const exportUsers = async (req, res, next) => {
  try {
    // Usamos el servicio con el filtro de usuario para obtener solo sus empleados
    const { users } = await userService.getUsers({ skip: 0, take: undefined }, req.user); 
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Usuarios Staff");
    
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Nombre", key: "nombre", width: 30 },
      { header: "Correo", key: "correo", width: 30 },
      { header: "Área", key: "area", width: 25 },          
      { header: "Departamento", key: "departamento", width: 25 },
      { header: "Usuario de Login", key: "usuario_login", width: 20 },
    ];

    users.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        area: user.area?.nombre || "N/A", 
        departamento: user.area?.departamento?.nombre || "N/A",
        usuario_login: user.usuario_login || "N/A",
      });
    });

    worksheet.getRow(1).font = { bold: true };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=usuarios_staff.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const importUsers = async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const result = await userService.importUsersFromExcel(req.file.buffer, req.user);
      res.json(result);
    } catch (error) {
      next(error);
    }
};