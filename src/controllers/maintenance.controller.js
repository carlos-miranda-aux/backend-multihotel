// src/controllers/maintenance.controller.js
import * as maintenanceService from "../services/maintenance.service.js";
import ExcelJS from "exceljs";

// ... (getMaintenances, getMaintenance, createMaintenance - sin cambios) ...

export const getMaintenances = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const statusFilter = req.query.status || null;
    const skip = (page - 1) * limit;

    const whereClause = {};
    if (statusFilter === 'pendiente') {
      whereClause.estado = 'pendiente';
    } else if (statusFilter === 'historial') {
      whereClause.estado = {
        in: ['realizado', 'cancelado']
      };
    }
    
    const { 
      maintenances, 
      totalCount 
    } = await maintenanceService.getMaintenances({ 
      skip, 
      take: limit, 
      where: whereClause 
    });

    res.json({
      data: maintenances,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMaintenance = async (req, res) => {
  try {
    const maintenance = await maintenanceService.getMaintenanceById(req.params.id);
    if (!maintenance) return res.status(404).json({ message: "Maintenance not found" });
    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createMaintenance = async (req, res) => {
  try {
    const newMaintenance = await maintenanceService.createMaintenance(req.body);
    res.status(201).json(newMaintenance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMaintenance = async (req, res) => {
  try {
    const oldMaintenance = await maintenanceService.getMaintenanceById(req.params.id);
    if (!oldMaintenance) return res.status(404).json({ message: "Maintenance not found" });

    let dataToUpdate = { ...req.body };

    if (dataToUpdate.estado === 'pendiente') {
      dataToUpdate.diagnostico = null;
      dataToUpdate.acciones_realizadas = null;
      dataToUpdate.observaciones = null;
      dataToUpdate.fecha_realizacion = null;
    }

    const updatedMaintenance = await maintenanceService.updateMaintenance(req.params.id, dataToUpdate);
    res.json(updatedMaintenance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const deleteMaintenance = async (req, res) => {
  try {
    const oldMaintenance = await maintenanceService.getMaintenanceById(req.params.id);
    if (!oldMaintenance) return res.status(404).json({ message: "Maintenance not found" });
    await maintenanceService.deleteMaintenance(req.params.id);
    res.json({ message: "Maintenance deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const exportMaintenances = async (req, res) => {
  try {
    const { maintenances: allMaintenances } = await maintenanceService.getMaintenances({ 
      skip: 0, 
      take: undefined, 
      where: {} 
    });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mantenimientos");

    worksheet.columns = [
      { header: "ID Manto", key: "id", width: 10 },
      { header: "Equipo Etiqueta", key: "etiqueta", width: 20 },
      { header: "Descripción", key: "descripcion", width: 40 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Fecha Programada", key: "fecha_programada", width: 20 },
      { header: "Fecha Realización", key: "fecha_realizacion", width: 20 },
    ];

    allMaintenances.forEach((m) => {
      worksheet.addRow({
        id: m.id,
        etiqueta: m.device?.etiqueta || "N/A",
        descripcion: m.descripcion || "",
        estado: m.estado,
        fecha_programada: m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString() : "N/A",
        fecha_realizacion: m.fecha_realizacion ? new Date(m.fecha_realizacion).toLocaleDateString() : "N/A",
      });
    });
    
    worksheet.getRow(1).font = { bold: true };
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=mantenimientos.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al exportar mantenimientos" });
  }
};

// -----------------------------------------------------------
// 👈 FUNCIÓN 'exportIndividualMaintenance' CORREGIDA
// -----------------------------------------------------------
export const exportIndividualMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const maintenance = await maintenanceService.getMaintenanceById(id);

    if (!maintenance) {
      return res.status(404).json({ error: "Mantenimiento no encontrado" });
    }

    const device = maintenance.device;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Formato de Servicio");

    // --- Estilo de Formato ---
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Formato de Servicio - Manto #${maintenance.id}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    worksheet.getColumn('A').width = 20;
    worksheet.getColumn('B').width = 30;
    worksheet.getColumn('C').width = 20;
    worksheet.getColumn('D').width = 30;

    // --- Sección de Dispositivo ---
    worksheet.mergeCells('A3:D3');
    const deviceTitle = worksheet.getCell('A3');
    deviceTitle.value = "Detalles del Equipo";
    deviceTitle.font = { bold: true };
    deviceTitle.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} };

    worksheet.getCell('A4').value = "Etiqueta";
    worksheet.getCell('B4').value = device.etiqueta;
    worksheet.getCell('C4').value = "N° Serie";
    worksheet.getCell('D4').value = device.numero_serie;

    worksheet.getCell('A5').value = "Tipo";
    worksheet.getCell('B5').value = device.tipo?.nombre || "N/A";
    worksheet.getCell('C5').value = "Marca / Modelo";
    // 👈 CORRECCIÓN 1: 'worksSizseet' -> 'worksheet'
    worksheet.getCell('D5').value = `${device.marca || ''} / ${device.modelo || ''}`;

    // --- Sección de Usuario ---
    worksheet.mergeCells('A7:D7');
    const userTitle = worksheet.getCell('A7');
    userTitle.value = "Asignación";
    userTitle.font = { bold: true };
    userTitle.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} };

    worksheet.getCell('A8').value = "Usuario Asignado";
    worksheet.getCell('B8').value = device.usuario?.nombre || "No asignado";
    worksheet.getCell('C8').value = "Departamento";
    worksheet.getCell('D8').value = device.departamento?.nombre || "N/A";

    // --- Sección de Mantenimiento ---
    worksheet.mergeCells('A10:D10');
    const mantoTitle = worksheet.getCell('A10');
    mantoTitle.value = "Detalles del Servicio";
    mantoTitle.font = { bold: true };
    mantoTitle.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} };

    worksheet.getCell('A11').value = "Estado";
    worksheet.getCell('B11').value = maintenance.estado;
    
    worksheet.getCell('A12').value = "Fecha Programada";
    worksheet.getCell('B12').value = maintenance.fecha_programada ? new Date(maintenance.fecha_programada).toLocaleDateString() : "N/A";
    worksheet.getCell('C12').value = "Fecha Realización";
    worksheet.getCell('D12').value = maintenance.fecha_realizacion ? new Date(maintenance.fecha_realizacion).toLocaleDateString() : "N/A";

    worksheet.mergeCells('A13:B13');
    worksheet.getCell('A13').value = "Descripción Programada:";
    worksheet.mergeCells('A14:D16'); 
    const descCell = worksheet.getCell('A14');
    descCell.value = maintenance.descripcion;
    descCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    // --- Nueva sección de Reporte ---
    worksheet.mergeCells('A18:D18');
    const reporteTitle = worksheet.getCell('A18');
    reporteTitle.value = "Reporte del Técnico";
    reporteTitle.font = { bold: true };
    reporteTitle.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFE0E0E0'} };

    worksheet.mergeCells('A19:B19');
    worksheet.getCell('A19').value = "Diagnóstico (Qué encontró):";
    worksheet.mergeCells('A20:D23');
    const diagCell = worksheet.getCell('A20');
    diagCell.value = maintenance.diagnostico || (maintenance.estado === 'realizado' ? 'No especificado' : 'N/A');
    diagCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    worksheet.mergeCells('A24:B24');
    worksheet.getCell('A24').value = "Acciones Realizadas (Qué hizo):";
    worksheet.mergeCells('A25:D28');
    const accCell = worksheet.getCell('A25');
    accCell.value = maintenance.acciones_realizadas || (maintenance.estado === 'realizado' ? 'No especificado' : 'N/A');
    accCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    
    worksheet.mergeCells('A29:B29');
    worksheet.getCell('A29').value = "Observaciones Adicionales:";
    worksheet.mergeCells('A30:D32');
    const obsCell = worksheet.getCell('A30');
    obsCell.value = maintenance.observaciones || (maintenance.estado === 'realizado' ? 'No especificado' : 'N/A');
    obsCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    
    // --- Firma (recorremos las filas) ---
    worksheet.getCell('A34').value = "Técnico Realiza:";
    worksheet.mergeCells('B34:C34');
    worksheet.getCell('B34').border = { bottom: { style: 'thin' } };
    
    // 👈 CORRECCIÓN 2: 'workskey' -> 'worksheet'
    worksheet.getCell('A36').value = "Usuario Recibe:";
    worksheet.mergeCells('B36:C36');
    worksheet.getCell('B36').border = { bottom: { style: 'thin' } };

    // --- Enviar el archivo ---
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Servicio_Manto_${id}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error al exportar el formato de servicio:", error);
    res.status(500).json({ error: "Error al exportar el formato de servicio" });
  }
};