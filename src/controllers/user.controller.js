// src/controllers/user.controller.js
import * as userService from "../services/user.service.js";
import ExcelJS from "exceljs";

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    // Si limit viene como '0', lo tratamos como 0 numérico para el if, sino default 10
    const limitParam = req.query.limit; 
    const limit = (limitParam === '0') ? 0 : (parseInt(limitParam) || 10);
    
    const sortBy = req.query.sortBy || "nombre";
    const order = req.query.order || "asc";
    
    const skip = (page - 1) * limit;

    // Si el límite es 0, devolvemos TODOS los usuarios en formato Array simple
    if (limit === 0) {
        const { users } = await userService.getUsers({ 
            skip: 0, 
            take: undefined, 
            sortBy, 
            order 
        });
        return res.json(users);
    }

    // Respuesta Paginada (Objeto)
    const { users, totalCount } = await userService.getUsers({ skip, take: limit, search: req.query.search, sortBy, order });

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
    const users = await userService.getAllUsers();
    res.json(users); 
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
};
export const exportUsers = async (req, res, next) => {
  try {
    const { users } = await userService.getUsers({ skip: 0, take: undefined }); 
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Usuarios Crown");
    
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
    res.setHeader("Content-Disposition", "attachment; filename=usuarios_crown.xlsx");
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const importUsers = async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const result = await userService.importUsersFromExcel(req.file.buffer);
      res.json(result);
    } catch (error) {
      next(error);
    }
};