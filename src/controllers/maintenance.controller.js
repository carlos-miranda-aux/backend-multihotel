// src/controllers/maintenance.controller.js
import * as maintenanceService from "../services/maintenance.service.js";
import ExcelJS from "exceljs";
import { MAINTENANCE_STATUS } from "../config/constants.js"; 

export const getMaintenances = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const statusFilter = req.query.status || null;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "fecha_programada";
    const order = req.query.order || "desc";
    
    const skip = (page - 1) * limit;
    const whereClause = {};
    
    if (statusFilter === MAINTENANCE_STATUS.PENDING) {
        whereClause.estado = MAINTENANCE_STATUS.PENDING;
    } else if (statusFilter === 'historial') {
        whereClause.estado = { in: [MAINTENANCE_STATUS.COMPLETED, MAINTENANCE_STATUS.CANCELLED] };
    }

    if (search) {
      whereClause.AND = {
        OR: [
          { descripcion: { contains: search } },
          { device: { etiqueta: { contains: search } } },
          { device: { nombre_equipo: { contains: search } } }
        ]
      };
    }
    
    // 👈 PASAMOS req.user para filtrar
    const { maintenances, totalCount } = await maintenanceService.getMaintenances({ 
      skip, 
      take: limit, 
      where: whereClause,
      sortBy, 
      order 
    }, req.user);

    res.json({ data: maintenances, totalCount: totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
  } catch (error) { 
    next(error); 
  }
};

export const getMaintenance = async (req, res, next) => {
  try {
    const maintenance = await maintenanceService.getMaintenanceById(req.params.id, req.user);
    if (!maintenance) return res.status(404).json({ message: "Maintenance not found" });
    res.json(maintenance);
  } catch (error) {
    next(error);
  }
};

export const createMaintenance = async (req, res, next) => {
  try {
    // 👈 PASAMOS req.user
    const newMaintenance = await maintenanceService.createMaintenance(req.body, req.user);
    res.status(201).json(newMaintenance);
  } catch (error) {
    next(error);
  }
};

export const updateMaintenance = async (req, res, next) => {
  try {
    const oldMaintenance = await maintenanceService.getMaintenanceById(req.params.id, req.user);
    if (!oldMaintenance) return res.status(404).json({ message: "Maintenance not found or access denied" });

    let dataToUpdate = { ...req.body };

    if (dataToUpdate.estado === MAINTENANCE_STATUS.PENDING) {
      dataToUpdate.diagnostico = null;
      dataToUpdate.acciones_realizadas = null;
      dataToUpdate.observaciones = null;
      dataToUpdate.fecha_realizacion = null;
    }

    const updatedMaintenance = await maintenanceService.updateMaintenance(req.params.id, dataToUpdate, req.user);
    res.json(updatedMaintenance);
  } catch (error) {
    next(error);
  }
};

export const deleteMaintenance = async (req, res, next) => {
  try {
    const oldMaintenance = await maintenanceService.getMaintenanceById(req.params.id, req.user);
    if (!oldMaintenance) return res.status(404).json({ message: "Maintenance not found" });

    if (oldMaintenance.estado === MAINTENANCE_STATUS.COMPLETED || oldMaintenance.estado === MAINTENANCE_STATUS.CANCELLED) {
      return res.status(403).json({ message: "No se puede eliminar un mantenimiento que ya forma parte del historial." });
    }

    await maintenanceService.deleteMaintenance(req.params.id, req.user);
    res.json({ message: "Maintenance deleted" });
  } catch (error) {
    next(error);
  }
};

export const exportMaintenances = async (req, res, next) => {
  try {
    const { maintenances: allMaintenances } = await maintenanceService.getMaintenances({ 
      skip: 0, 
      take: undefined, 
      where: {} 
    }, req.user); // 👈 req.user para filtrar exportación
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mantenimientos");

    worksheet.columns = [
      { header: "ID Manto", key: "id", width: 10 },
      { header: "Equipo Etiqueta", key: "etiqueta", width: 20 },
      { header: "Nombre Equipo", key: "nombre_equipo", width: 25 },        
      { header: "N° Serie", key: "numero_serie", width: 25 },            
      { header: "Usuario Asignado", key: "usuario_nombre", width: 30 }, 
      { header: "Usuario Login", key: "usuario_login", width: 20 }, 
      { header: "IP", key: "ip_equipo", width: 15 },                
      { header: "Tipo Mantenimiento", key: "tipo_mantenimiento", width: 25 }, 
      { header: "Descripción Programada", key: "descripcion", width: 40 },
      { header: "Diagnóstico", key: "diagnostico", width: 40 },          
      { header: "Acciones Realizadas", key: "acciones", width: 40 },     
      { header: "Observaciones Adicionales", key: "observaciones", width: 40 }, 
      { header: "Estado", key: "estado", width: 15 },
      { header: "Fecha Programada", key: "fecha_programada", width: 20 },
      { header: "Fecha Realización", key: "fecha_realizacion", width: 20 },
      { header: "Área", key: "area", width: 20 },
      { header: "Departamento", key: "departamento", width: 20 },
    ];

    allMaintenances.forEach((m) => {
      worksheet.addRow({
        id: m.id,
        etiqueta: m.device?.etiqueta || "N/A",
        nombre_equipo: m.device?.nombre_equipo || "N/A", 
        numero_serie: m.device?.numero_serie || "N/A",   
        usuario_nombre: m.device?.usuario?.nombre || "N/A", 
        usuario_login: m.device?.usuario?.usuario_login || "N/A", 
        ip_equipo: m.device?.ip_equipo || "N/A", 
        tipo_mantenimiento: m.tipo_mantenimiento || "N/A", 
        descripcion: m.descripcion || "",
        diagnostico: m.diagnostico || "N/A",          
        acciones: m.acciones_realizadas || "N/A", 
        observaciones: m.observaciones || "N/A",      
        estado: m.estado,
        fecha_programada: m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString() : "N/A",
        fecha_realizacion: m.fecha_realizacion ? new Date(m.fecha_realizacion).toLocaleDateString() : "N/A",
        area: m.device?.area?.nombre || "N/A",
        departamento: m.device?.area?.departamento?.nombre || "N/A",
      });
    });
    
    worksheet.getRow(1).font = { bold: true };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mantenimientos.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const exportIndividualMaintenance = async (req, res, next) => {
  try {
    const { id } = req.params;
    // 👈 PASAMOS req.user
    const maintenance = await maintenanceService.getMaintenanceById(id, req.user);

    if (!maintenance) return res.status(404).json({ error: "Mantenimiento no encontrado o sin permisos" });
    if (!maintenance.device) return res.status(404).json({ error: "No se encontró el dispositivo asociado a este mantenimiento." });
    const device = maintenance.device;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Formato de Servicio");

    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Formato de Servicio - Manto #${maintenance.id}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    worksheet.getColumn('A').width = 20;
    worksheet.getColumn('B').width = 30;
    worksheet.getColumn('C').width = 20;
    worksheet.getColumn('D').width = 30;

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
    worksheet.getCell('D5').value = `${device.marca || ''} / ${device.modelo || ''}`;

    worksheet.mergeCells('A7:D7');
    const userTitle = worksheet.getCell('A7');
    userTitle.value = "Asignación";
    userTitle.font = { bold: true };
    userTitle.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} };

    worksheet.getCell('A8').value = "Usuario Asignado";
    worksheet.getCell('B8').value = device.usuario?.nombre || "No asignado";
    worksheet.getCell('C8').value = "Área"; 
    worksheet.getCell('D8').value = device.area?.nombre || "N/A"; 

    worksheet.getCell('A9').value = "Departamento";
    worksheet.mergeCells('B9:D9'); 
    worksheet.getCell('B9').value = device.area?.departamento?.nombre || "N/A"; 

    worksheet.mergeCells('A11:D11'); 
    const mantoTitle = worksheet.getCell('A11');
    mantoTitle.value = "Detalles del Servicio";
    mantoTitle.font = { bold: true };
    mantoTitle.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} };

    worksheet.getCell('A12').value = "Tipo"; 
    worksheet.getCell('B12').value = maintenance.tipo_mantenimiento || 'N/A'; 
    worksheet.getCell('C12').value = "Estado";
    worksheet.getCell('D12').value = maintenance.estado;
    

    worksheet.getCell('A13').value = "Fecha Programada";
    worksheet.getCell('B13').value = maintenance.fecha_programada ? new Date(maintenance.fecha_programada).toLocaleDateString() : "N/A";
    worksheet.getCell('C13').value = "Fecha Realización";
    worksheet.getCell('D13').value = maintenance.fecha_realizacion ? new Date(maintenance.fecha_realizacion).toLocaleDateString() : "N/A";

    worksheet.mergeCells('A14:B14'); 
    worksheet.getCell('A14').value = "Descripción Programada:";
    worksheet.mergeCells('A15:D17'); 
    const descCell = worksheet.getCell('A15'); 
    descCell.value = maintenance.descripcion;
    descCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    worksheet.mergeCells('A19:D19'); 
    const reporteTitle = worksheet.getCell('A19');
    reporteTitle.value = "Reporte del Técnico";
    reporteTitle.font = { bold: true };
    reporteTitle.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFE0E0E0'} };

    worksheet.mergeCells('A20:B20'); 
    worksheet.getCell('A20').value = "Diagnóstico (Qué encontró):";
    worksheet.mergeCells('A21:D24'); 
    const diagCell = worksheet.getCell('A21'); 
    diagCell.value = maintenance.diagnostico || (maintenance.estado === 'realizado' ? 'No especificado' : 'N/A');
    diagCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

    worksheet.mergeCells('A25:B25'); 
    worksheet.getCell('A25').value = "Acciones Realizadas (Qué hizo):";
    worksheet.mergeCells('A26:D29'); 
    const accCell = worksheet.getCell('A26'); 
    accCell.value = maintenance.acciones_realizadas || (maintenance.estado === 'realizado' ? 'No especificado' : 'N/A');
    accCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    
    worksheet.mergeCells('A30:B30'); 
    worksheet.getCell('A30').value = "Observaciones Adicionales:";
    worksheet.mergeCells('A31:D33'); 
    const obsCell = worksheet.getCell('A31'); 
    obsCell.value = maintenance.observaciones || (maintenance.estado === 'realizado' ? 'No especificado' : 'N/A');
    obsCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    
    worksheet.getCell('A35').value = "Técnico Realiza:";
    worksheet.mergeCells('B35:C35');
    worksheet.getCell('B35').border = { bottom: { style: 'thin' } };
    
    worksheet.getCell('A37').value = "Usuario Recibe:";
    worksheet.mergeCells('B37:C37');
    worksheet.getCell('B37').border = { bottom: { style: 'thin' } };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Servicio_Manto_${id}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    next(error);
  }
};