// controllers/device.controller.js
import * as deviceService from "../services/device.service.js";
import { logAction } from "../services/audit.service.js";
import ExcelJS from "exceljs";

// 📌 Obtener todos los dispositivos
export const getDevices = async (req, res) => {
  try {
    const devices = await deviceService.getDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener dispositivos" });
  }
};

// 📌 Obtener un dispositivo por ID
export const getDevice = async (req, res) => {
  try {
    const device = await deviceService.getDeviceById(req.params.id);
    if (!device) return res.status(404).json({ error: "Dispositivo no encontrado" });
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener dispositivo" });
  }
};

// 📌 Crear un nuevo dispositivo
export const createDevice = async (req, res) => {
  const userId = req.user.id;
  try {
    const newDevice = await deviceService.createDevice(req.body);

    // AUDITORÍA
    //await logAction(userId, "CREATE", "Device", newDevice.id, null, { ...newDevice });

    res.status(201).json(newDevice);
  } catch (error) {
    res.status(500).json({ error: "Error al crear dispositivo" });
  }
};

// 📌 Actualizar un dispositivo
export const updateDevice = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldDevice = await deviceService.getDeviceById(req.params.id);
    if (!oldDevice) return res.status(404).json({ error: "Dispositivo no encontrado" });

    const updatedDevice = await deviceService.updateDevice(req.params.id, req.body);

    // AUDITORÍA
    //await logAction(userId, "UPDATE", "Device", req.params.id, { ...oldDevice }, { ...updatedDevice });

    res.json(updatedDevice);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar dispositivo" });
  }
};

// 📌 Eliminar un dispositivo
export const deleteDevice = async (req, res) => {
  const userId = req.user.id;
  try {
    const oldDevice = await deviceService.getDeviceById(req.params.id);
    if (!oldDevice) return res.status(404).json({ error: "Dispositivo no encontrado" });

    await deviceService.deleteDevice(req.params.id);

    // AUDITORÍA
    //await logAction(userId, "DELETE", "Device", req.params.id, { ...oldDevice }, null);

    res.json({ message: "Dispositivo eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar dispositivo" });
  }
};

/* 📌 Exportar dispositivos inactivos a Excel (NO se audita, es solo lectura) */
export const exportInactiveDevices = async (req, res) => {
  try {
    const inactiveDevices = await deviceService.getInactiveDevices();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dispositivos Inactivos");

    // Definir encabezados
    worksheet.columns = [
      { header: "N° Equipo", key: "numero", width: 12 },
      { header: "Etiqueta", key: "etiqueta", width: 20 },
      { header: "Tipo", key: "tipo", width: 20 },
      { header: "Marca", key: "marca", width: 20 },
      { header: "Modelo", key: "modelo", width: 20 },
      { header: "Observaciones", key: "observaciones", width: 30 },
    ];

    // Agregar filas
    inactiveDevices.forEach((device, index) => {
      worksheet.addRow({
        numero: index + 1,
        etiqueta: device.etiqueta || "",
        tipo: device.tipo?.nombre || "",
        marca: device.marca || "",
        modelo: device.modelo || "",
        observaciones: device.disposals?.[0]?.observaciones || "",
      });
    });

    // Estilo encabezados
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };

    // Enviar archivo
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=dispositivos_inactivos.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al exportar dispositivos inactivos" });
  }
};