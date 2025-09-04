import * as maintenanceService from "../services/maintenance.service.js";
import { logAction } from "../services/audit.service.js";

// 📌 Obtener todos los mantenimientos
export const getMaintenances = async (req, res) => {
  try {
    const maintenances = await maintenanceService.getMaintenances();
    res.json(maintenances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Obtener un mantenimiento por ID
export const getMaintenance = async (req, res) => {
  try {
    const maintenance = await maintenanceService.getMaintenanceById(req.params.id);
    if (!maintenance) return res.status(404).json({ message: "Maintenance not found" });
    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Crear un nuevo mantenimiento
export const createMaintenance = async (req, res) => {
  const userId = req.user.id;
  try {
    const newMaintenance = await maintenanceService.createMaintenance(req.body);

    // AUDITORÍA
    await logAction(userId, "CREATE", "Maintenance", newMaintenance.id, null, newMaintenance);

    res.status(201).json(newMaintenance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Actualizar un mantenimiento
export const updateMaintenance = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldMaintenance = await maintenanceService.getMaintenanceById(req.params.id);
    if (!oldMaintenance) return res.status(404).json({ message: "Maintenance not found" });

    const updatedMaintenance = await maintenanceService.updateMaintenance(req.params.id, req.body);

    // AUDITORÍA
    await logAction(userId, "UPDATE", "Maintenance", req.params.id, oldMaintenance, updatedMaintenance);

    res.json(updatedMaintenance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Eliminar un mantenimiento
export const deleteMaintenance = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldMaintenance = await maintenanceService.getMaintenanceById(req.params.id);
    if (!oldMaintenance) return res.status(404).json({ message: "Maintenance not found" });

    await maintenanceService.deleteMaintenance(req.params.id);

    // AUDITORÍA
    await logAction(userId, "DELETE", "Maintenance", req.params.id, oldMaintenance, null);

    res.json({ message: "Maintenance deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
