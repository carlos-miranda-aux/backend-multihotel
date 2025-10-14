import * as deviceTypeService from "../services/deviceType.service.js";
import { logAction } from "../services/audit.service.js";


// 📌 Obtener todos los tipos de dispositivo
export const getDeviceTypes = async (req, res) => {
  try {
    const deviceTypes = await deviceTypeService.getDeviceTypes();
    res.json(deviceTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Obtener un tipo de dispositivo por ID
export const getDeviceType = async (req, res) => {
  try {
    const { id } = req.params;
    const deviceType = await deviceTypeService.getDeviceTypeById(id);
    if (!deviceType) return res.status(404).json({ message: "DeviceType not found" });
    res.json(deviceType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Crear un nuevo tipo de dispositivo
export const createDeviceType = async (req, res) => {
  const userId = req.user.id;
  try {
    const newDeviceType = await deviceTypeService.createDeviceType(req.body);

    // AUDITORÍA
    //await logAction(userId, "CREATE", "DeviceType", newDeviceType.id, null, { ...newDeviceType });

    res.status(201).json(newDeviceType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Actualizar un tipo de dispositivo
export const updateDeviceType = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldDeviceType = await deviceTypeService.getDeviceTypeById(req.params.id);
    if (!oldDeviceType) return res.status(404).json({ message: "DeviceType not found" });

    const updatedDeviceType = await deviceTypeService.updateDeviceType(req.params.id, req.body);

    // AUDITORÍA
    //await logAction(userId, "UPDATE", "DeviceType", req.params.id, { ...oldDeviceType }, { ...updatedDeviceType });

    res.json(updatedDeviceType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📌 Eliminar un tipo de dispositivo
export const deleteDeviceType = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldDeviceType = await deviceTypeService.getDeviceTypeById(req.params.id);
    if (!oldDeviceType) return res.status(404).json({ message: "DeviceType not found" });

    await deviceTypeService.deleteDeviceType(req.params.id);

    // AUDITORÍA
    //await logAction(userId, "DELETE", "DeviceType", req.params.id, { ...oldDeviceType }, null);

    res.json({ message: "DeviceType deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};