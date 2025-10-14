import * as authService from "../services/auth.service.js";
import prisma from "../PrismaClient.js";
import { logAction } from "../services/audit.service.js";

// 📌 Login de usuarios
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const data = await authService.loginUser({ identifier, password });
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 📌 Obtener todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await authService.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Eliminar usuario
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

    // AUDITORÍA
    //await logAction(req.user.id, "DELETE", "userSistema", req.params.id, { ...userToDelete }, null);

    await authService.deleteUser(req.params.id);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Actualizar usuario (nombre, email, rol y/o contraseña)
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

    // AUDITORÍA
    //await logAction(req.user.id, "UPDATE", "userSistema", userId, { ...oldUser }, { ...updatedUser });

    res.json({ message: "Usuario actualizado correctamente", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 📌 Crear usuario (para uso de administradores)
export const createUser = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await authService.registerUser(req.body);

    // AUDITORÍA
    //await logAction(userId, "CREATE", "userSistema", user.id, null, { ...user });

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};