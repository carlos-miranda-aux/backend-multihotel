// controllers/disposal.controller.js
import * as deviceService from "../services/device.service.js";
import ExcelJS from "exceljs";

// ⚠️ ESTA FUNCIÓN ESTÁ MODIFICADA (getDisposals)
export const getDisposals = async (req, res) => {
  try {
    // 1. Leer parámetros de paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 2. Llamar al servicio de 'device' (que es el correcto)
    const { devices, totalCount } = await deviceService.getInactiveDevices({ skip, take: limit });
    
    // 3. Devolver los datos
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

// --- FUNCIONES SIN CAMBIOS ---
// (getDisposal, updateDisposal, deleteDisposal, exportDisposalsExcel)
// Nota: 'getDisposal' y 'updateDisposal' aquí se refieren a la tabla 'disposal'
// que ya no usas. Las dejamos por si acaso, pero la lógica principal
// ya está en el device.controller.

export const getDisposal = async (req, res) => {
  try {
    const disposal = await deviceService.getDeviceById(req.params.id); // Apuntamos al device
    if (!disposal) return res.status(404).json({ error: "Baja no encontrada" });
    res.json(disposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Esta función ahora solo debería actualizar las notas de baja.
// La lógica principal está en device.controller.js
export const updateDisposal = async (req, res) => {
  try {
    const oldDisposal = await deviceService.getDeviceById(req.params.id);
    if (!oldDisposal) return res.status(404).json({ message: "Disposal not found" });
    
    // Solo actualiza los campos de baja
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
    // Esto no debería usarse, ya que no borramos.
    res.status(403).json({ error: "Las bajas no se pueden eliminar, es un registro permanente." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const exportDisposalsExcel = async (req, res) => {
  try {
    const { devices } = await deviceService.getInactiveDevices({ skip: 0, take: undefined });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bajas");
    worksheet.columns = [
      { header: "No", key: "id", width: 10 },
      { header: "Etiqueta Equipo", key: "etiqueta", width: 20 },
      { header: "Tipo Equipo", key: "tipo", width: 20 },
      { header: "Marca", key: "marca", width: 20 },
      { header: "Modelo", key: "modelo", width: 20 },
      { header: "Motivo", key: "motivo_baja", width: 40 },
      { header: "Observaciones", key: "observaciones_baja", width: 40 }
    ];
    devices.forEach((d) => {
      worksheet.addRow({
        id: d.id,
        etiqueta: d.etiqueta || "N/A",
        tipo: d.tipo?.nombre || "N/A",
        marca: d.marca || "N/A",
        modelo: d.modelo || "N/A",
        motivo_baja: d.motivo_baja || "",
        observaciones_baja: d.observaciones_baja || ""
      });
    });
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=bajas.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};