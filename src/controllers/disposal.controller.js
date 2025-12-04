// src/controllers/disposal.controller.js
import * as deviceService from "../services/device.service.js";
import ExcelJS from "exceljs";

export const getDisposals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || ""; 
    const skip = (page - 1) * limit;

    // 👈 PASAMOS req.user al servicio de dispositivos
    const { devices, totalCount } = await deviceService.getInactiveDevices({ skip, take: limit, search }, req.user);
    
    res.json({
      data: devices,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    next(error);
  }
};

export const getDisposal = async (req, res, next) => {
  try {
    // 👈 PASAMOS req.user para filtrar
    const disposal = await deviceService.getDeviceById(req.params.id, req.user); 
    if (!disposal) return res.status(404).json({ error: "Baja no encontrada o sin permisos" });
    res.json(disposal);
  } catch (error) {
    next(error);
  }
};

export const updateDisposal = async (req, res, next) => {
  try {
    // Verificamos existencia y permiso primero
    const oldDisposal = await deviceService.getDeviceById(req.params.id, req.user);
    if (!oldDisposal) return res.status(404).json({ message: "Baja no encontrada o sin permisos" });
    
    const dataToUpdate = {
      motivo_baja: req.body.motivo_baja,
      observaciones_baja: req.body.observaciones_baja
    };

    // Actualizamos pasando req.user
    const disposal = await deviceService.updateDevice(req.params.id, dataToUpdate, req.user);
    res.json(disposal);
  } catch (error) {
    next(error);
  }
};

export const deleteDisposal = async (req, res, next) => {
  try {
    res.status(403).json({ error: "Las bajas no se pueden eliminar, es un registro histórico permanente." });
  } catch (error) {
    next(error);
  }
};

export const exportDisposalsExcel = async (req, res, next) => {
  try {
    // 👈 PASAMOS req.user
    const { devices } = await deviceService.getInactiveDevices({ skip: 0, take: undefined }, req.user); 
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bajas de Equipos");
    
    worksheet.columns = [
      { header: "No", key: "id", width: 10 },
      { header: "Etiqueta", key: "etiqueta", width: 15 },
      { header: "Nombre Equipo", key: "nombre_equipo", width: 25 },
      { header: "N° Serie", key: "numero_serie", width: 25 },
      { header: "Marca", key: "marca", width: 15 },
      { header: "Modelo", key: "modelo", width: 20 },
      { header: "Usuario Asignado", key: "usuario_nombre", width: 30 },
      { header: "Usuario Login", key: "usuario_login", width: 20 },
      { header: "IP", key: "ip_equipo", width: 15 },
      { header: "Tipo", key: "tipo", width: 20 },
      { header: "Motivo", key: "motivo_baja", width: 40 },
      { header: "Observaciones", key: "observaciones_baja", width: 40 }
    ];

    devices.forEach((d) => {
      worksheet.addRow({
        id: d.id,
        etiqueta: d.etiqueta || "N/A",
        nombre_equipo: d.nombre_equipo || "N/A",
        numero_serie: d.numero_serie || "N/A",
        marca: d.marca || "N/A",
        modelo: d.modelo || "N/A",
        usuario_nombre: d.usuario?.nombre || "N/A",
        usuario_login: d.usuario?.usuario_login || "N/A",
        ip_equipo: d.ip_equipo || "N/A",
        tipo: d.tipo?.nombre || "N/A",
        motivo_baja: d.motivo_baja || "",
        observaciones_baja: d.observaciones_baja || ""
      });
    });
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=bajas.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};