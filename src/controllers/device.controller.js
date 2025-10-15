// controllers/device.controller.js
import * as deviceService from "../services/device.service.js";
import ExcelJS from "exceljs";
import prisma from "../PrismaClient.js";

export const getDevices = async (req, res) => {
  try {
    const devices = await deviceService.getActiveDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener dispositivos" });
  }
};

export const getDevice = async (req, res) => {
  try {
    const device = await deviceService.getDeviceById(req.params.id);
    if (!device) return res.status(404).json({ error: "Dispositivo no encontrado" });
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener dispositivo" });
  }
};

export const createDevice = async (req, res) => {
  try {
    const { ...deviceData } = req.body;
    
    // Buscar el ID del estado "Activo"
    const estadoActivo = await prisma.deviceStatus.findFirst({
      where: { nombre: "Activo" },
    });

    if (!estadoActivo) {
      return res.status(400).json({ error: 'No existe un estado llamado "Activo" en la base de datos.' });
    }

    const newDevice = await deviceService.createDevice({
      ...deviceData,
      estadoId: estadoActivo.id, // Asignar el ID del estado "Activo" por defecto
    });
    res.status(201).json(newDevice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el dispositivo" });
  }
};

export const updateDevice = async (req, res) => {
  try {
    const oldDevice = await deviceService.getDeviceById(req.params.id);
    if (!oldDevice) return res.status(404).json({ error: "Dispositivo no encontrado" });
    const updatedDevice = await deviceService.updateDevice(req.params.id, req.body);
    res.json(updatedDevice);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar dispositivo" });
  }
};

// 📌 Modificada para eliminar el dispositivo permanentemente
export const deleteDevice = async (req, res) => {
  try {
    const oldDevice = await deviceService.getDeviceById(req.params.id);
    if (!oldDevice) return res.status(404).json({ error: "Dispositivo no encontrado" });
    await deviceService.deleteDevice(req.params.id);
    res.json({ message: "Dispositivo eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar dispositivo" });
  }
};

export const exportInactiveDevices = async (req, res) => {
  try {
    const inactiveDevices = await deviceService.getInactiveDevices();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dispositivos Inactivos");
    worksheet.columns = [
      { header: "N° Equipo", key: "numero", width: 12 },
      { header: "Etiqueta", key: "etiqueta", width: 20 },
      { header: "Tipo", key: "tipo", width: 20 },
      { header: "Marca", key: "marca", width: 20 },
      { header: "Modelo", key: "modelo", width: 20 },
      { header: "Observaciones", key: "observaciones", width: 30 },
    ];
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
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };
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