import * as deviceStatusService from "../services/deviceStatus.service.js";
import { logAction } from "../services/audit.service.js";


// 📌 Obtener todos los estados de dispositivos
export const getDeviceStatuses = async (req, res) => {
  try {
    const statuses = await deviceStatusService.getDeviceStatuses();
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Obtener un estado de dispositivo por ID
export const getDeviceStatus = async (req, res) => {
  try {
    const status = await deviceStatusService.getDeviceStatusById(req.params.id);
    if (!status) return res.status(404).json({ message: "DeviceStatus not found" });
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Crear un nuevo estado de dispositivo
export const createDeviceStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    const status = await deviceStatusService.createDeviceStatus(req.body);

    // AUDITORÍA
    //await logAction(userId, "CREATE", "DeviceStatus", status.id, null, { ...status });

    res.status(201).json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Actualizar un estado de dispositivo
export const updateDeviceStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldStatus = await deviceStatusService.getDeviceStatusById(req.params.id);
    if (!oldStatus) return res.status(404).json({ message: "DeviceStatus not found" });

    const status = await deviceStatusService.updateDeviceStatus(req.params.id, req.body);

    // AUDITORÍA
    //await logAction(userId, "UPDATE", "DeviceStatus", req.params.id, { ...oldStatus }, { ...status });

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Eliminar un estado de dispositivo
export const deleteDeviceStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldStatus = await deviceStatusService.getDeviceStatusById(req.params.id);
    if (!oldStatus) return res.status(404).json({ message: "DeviceStatus not found" });

    await deviceStatusService.deleteDeviceStatus(req.params.id);

    // AUDITORÍA
    //await logAction(userId, "DELETE", "DeviceStatus", req.params.id, { ...oldStatus }, null);

    res.json({ message: "DeviceStatus deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};