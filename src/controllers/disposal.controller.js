// src/controllers/disposal.controller.js
import * as deviceService from "../services/device.service.js";
import ExcelJS from "exceljs";

export const getDisposals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || ""; // 👈 Capturamos búsqueda
    const skip = (page - 1) * limit;

    // Llamamos al servicio de 'device' actualizado con 'search'
    const { devices, totalCount } = await deviceService.getInactiveDevices({ skip, take: limit, search });
    
    res.json({
      data: devices,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ... (Resto de funciones: getDisposal, updateDisposal, deleteDisposal permanecen iguales)

export const getDisposal = async (req, res) => {
  try {
    const disposal = await deviceService.getDeviceById(req.params.id); 
    if (!disposal) return res.status(404).json({ error: "Baja no encontrada" });
    res.json(disposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateDisposal = async (req, res) => {
  try {
    const oldDisposal = await deviceService.getDeviceById(req.params.id);
    if (!oldDisposal) return res.status(404).json({ message: "Disposal not found" });
    
    const dataToUpdate = {
      motivo_baja: req.body.motivo_baja,
      observaciones_baja: req.body.observaciones_baja
    };

    const disposal = await deviceService.updateDevice(req.params.id, dataToUpdate);
    res.json(disposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDisposal = async (req, res) => {
  try {
    res.status(403).json({ error: "Las bajas no se pueden eliminar, es un registro permanente." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const exportDisposalsExcel = async (req, res) => {
  try {
    // Se usa getInactiveDevices del deviceService, que incluye la relación 'usuario'
    const { devices } = await deviceService.getInactiveDevices({ skip: 0, take: undefined }); 
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
        // Información del equipo (campos directos y anidados)
        nombre_equipo: d.nombre_equipo || "N/A",
        numero_serie: d.numero_serie || "N/A",
        marca: d.marca || "N/A",
        modelo: d.modelo || "N/A",
        // Acceso a la información del usuario asignado
        usuario_nombre: d.usuario?.nombre || "N/A",
        usuario_login: d.usuario?.usuario_login || "N/A",
        // Información de red
        ip_equipo: d.ip_equipo || "N/A",
        // Información de la baja
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
    res.status(500).json({ error: error.message });
  }
};