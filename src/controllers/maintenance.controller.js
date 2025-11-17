// src/controllers/maintenance.controller.js
import * as maintenanceService from "../services/maintenance.service.js";
import ExcelJS from "exceljs";
// (Importaciones de email y prisma eliminadas)

export const getMaintenances = async (req, res) => {
  try {
    const maintenances = await maintenanceService.getMaintenances();
    res.json(maintenances);
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

// 👇 --- FUNCIÓN REVERTIDA --- 👇
// (Ya no tiene la lógica de envío de email)
export const createMaintenance = async (req, res) => {
  try {
    const newMaintenance = await maintenanceService.createMaintenance(req.body);
    // (Lógica de email eliminada)
    res.status(201).json(newMaintenance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// 👆 --- FIN DE LA FUNCIÓN --- 👆

export const updateMaintenance = async (req, res) => {
  try {
    const oldMaintenance = await maintenanceService.getMaintenanceById(req.params.id);
    if (!oldMaintenance) return res.status(404).json({ message: "Maintenance not found" });
    const updatedMaintenance = await maintenanceService.updateMaintenance(req.params.id, req.body);
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
    const maintenances = await maintenanceService.getMaintenances(); // Ya incluye el device
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

    maintenances.forEach((m) => {
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
    
    // Ancho de columnas
    worksheet.getColumn('A').width = 20;
    worksheet.getColumn('B').width = 30;
    worksheet.getColumn('C').width = 20;
    worksheet.getColumn('D').width = 30;

    // --- Sección de Dispositivo ---
    worksheet.mergeCells('A3:D3');
    const deviceTitle = worksheet.getCell('A3');
    deviceTitle.value = "Detalles del Equipo";
    deviceTitle.font = { bold: true };
    deviceTitle.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} }; // Fondo gris

    worksheet.getCell('A4').value = "Etiqueta";
    worksheet.getCell('B4').value = device.etiqueta;
    worksheet.getCell('C4').value = "N° Serie";
    worksheet.getCell('D4').value = device.numero_serie;

    worksheet.getCell('A5').value = "Tipo";
    worksheet.getCell('B5').value = device.tipo?.nombre || "N/A";
    worksheet.getCell('C5').value = "Marca / Modelo";
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
    worksheet.getCell('A13').value = "Descripción del Servicio:";
    worksheet.mergeCells('A14:D18'); // Celda grande para la descripción
    const descCell = worksheet.getCell('A14');
    descCell.value = maintenance.descripcion;
    descCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    // --- Firma ---
    worksheet.getCell('A20').value = "Técnico Realiza:";
    worksheet.mergeCells('B20:C20');
    worksheet.getCell('B20').border = { bottom: { style: 'thin' } };
    
    worksheet.getCell('A22').value = "Usuario Recibe:";
    worksheet.mergeCells('B22:C22');
    worksheet.getCell('B22').border = { bottom: { style: 'thin' } };

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
    console.error(error);
    res.status(500).json({ error: "Error al exportar el formato de servicio" });
  }
};