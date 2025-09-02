import * as authService from "../services/auth.service.js";

export const register = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { token, user } = await authService.loginUser(req.body);
    res.json({ token, user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await authService.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Eliminar usuario
export const deleteUser = async (req, res) => {
  try {
    await authService.deleteUser(req.params.id);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Actualizar contraseña
export const updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await authService.updatePassword(req.params.id, password);
    res.json({ message: "Contraseña actualizada correctamente", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};