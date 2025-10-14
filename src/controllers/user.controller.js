import * as userService from "../services/user.service.js";
import { logAction } from "../services/audit.service.js";


// 📌 Obtener todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Obtener un usuario por ID
export const getUser = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Crear un nuevo usuario
export const createUser = async (req, res) => {
  const userId = req.user.id;
  try {
    const newUser = await userService.createUser(req.body);

    // AUDITORÍA
    //await logAction(userId, "CREATE", "User", newUser.id, null, { ...newUser });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Actualizar un usuario
export const updateUser = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldUser = await userService.getUserById(req.params.id);
    if (!oldUser) return res.status(404).json({ message: "Usuario no encontrado" });

    const updatedUser = await userService.updateUser(req.params.id, req.body);

    // AUDITORÍA
    //await logAction(userId, "UPDATE", "User", req.params.id, { ...oldUser }, { ...updatedUser });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Eliminar un usuario
export const deleteUser = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldUser = await userService.getUserById(req.params.id);
    if (!oldUser) return res.status(404).json({ message: "Usuario no encontrado" });

    await userService.deleteUser(req.params.id);

    // AUDITORÍA
    //await logAction(userId, "DELETE", "User", req.params.id, { ...oldUser }, null);

    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};