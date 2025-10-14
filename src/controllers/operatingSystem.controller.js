import {
  getOperatingSystems,
  getOperatingSystemById,
  createOperatingSystem,
  updateOperatingSystem,
  deleteOperatingSystem
} from "../services/operatingSystem.service.js";
import { logAction } from "../services/audit.service.js";

// 📌 Obtener todos los sistemas operativos
export const getOperatingSystemsController = async (req, res) => {
  try {
    const systems = await getOperatingSystems();
    res.json(systems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Obtener un sistema operativo por ID
export const getOperatingSystemController = async (req, res) => {
  try {
    const { id } = req.params;
    const system = await getOperatingSystemById(id);

    if (!system) return res.status(404).json({ message: "OperatingSystem not found" });

    res.json(system);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Crear un nuevo sistema operativo
export const createOperatingSystemController = async (req, res) => {
  const userId = req.user.id;
  try {
    const newSystem = await createOperatingSystem(req.body);

    // AUDITORÍA
    //await logAction(userId, "CREATE", "OperatingSystem", newSystem.id, null, { ...newSystem });

    res.status(201).json(newSystem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Actualizar un sistema operativo
export const updateOperatingSystemController = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldSystem = await getOperatingSystemById(req.params.id);
    if (!oldSystem) return res.status(404).json({ message: "OperatingSystem not found" });

    const updatedSystem = await updateOperatingSystem(req.params.id, req.body);

    // AUDITORÍA
    //await logAction(userId, "UPDATE", "OperatingSystem", req.params.id, { ...oldSystem }, { ...updatedSystem });

    res.json(updatedSystem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Eliminar un sistema operativo
export const deleteOperatingSystemController = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldSystem = await getOperatingSystemById(req.params.id);
    if (!oldSystem) return res.status(404).json({ message: "OperatingSystem not found" });

    await deleteOperatingSystem(req.params.id);

    // AUDITORÍA
    //await logAction(userId, "DELETE", "OperatingSystem", req.params.id, { ...oldSystem }, null);

    res.json({ message: "OperatingSystem deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};