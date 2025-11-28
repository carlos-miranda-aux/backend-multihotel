// src/controllers/device.controller.js
import * as deviceService from "../services/device.service.js";
import ExcelJS from "exceljs";
import prisma from "../PrismaClient.js";

export const getDevices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || ""; 
    const filter = req.query.filter || ""; 
    const skip = (page - 1) * limit;

    const { devices, totalCount } = await deviceService.getActiveDevices({ skip, take: limit, search, filter });
    
    res.json({
      data: devices,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    res.status(500).json({ error: "Error al obtener dispositivos" });
  }
};

export const getAllActiveDeviceNames = async (req, res) => {
  try {
    const devices = await deviceService.getAllActiveDeviceNames();
    res.json(devices); 
  } catch (error) {
    res.status(500).json({ error: "Error al obtener lista de dispositivos" });
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

export const getPandaStatus = async (req, res) => {
  try {
    const counts = await deviceService.getPandaStatusCounts();
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el estado de Panda" });
  }
};

// 👇 ESTA ES LA FUNCIÓN QUE USA EL REPORTE DE BAJAS. AHORA ESTÁ CORREGIDA.
export const exportInactiveDevices = async (req, res) => {
  try {
    const { devices } = await deviceService.getInactiveDevices({ skip: 0, take: undefined }); 
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dispositivos Inactivos");
    
    worksheet.columns = [
      { header: "N°", key: "numero", width: 10 },
      { header: "Etiqueta", key: "etiqueta", width: 15 },
      { header: "Nombre Equipo", key: "nombre_equipo", width: 25 },     // 👈 NUEVO
      { header: "N° Serie", key: "numero_serie", width: 25 },         // 👈 NUEVO
      { header: "Marca", key: "marca", width: 15 },                   // 👈 NUEVO
      { header: "Modelo", key: "modelo", width: 20 },                 // 👈 NUEVO
      { header: "Usuario Asignado", key: "usuario_nombre", width: 30 }, // 👈 NUEVO
      { header: "Usuario Login", key: "usuario_login", width: 20 },     // 👈 NUEVO
      { header: "IP", key: "ip_equipo", width: 15 },                    // 👈 NUEVO
      { header: "Tipo", key: "tipo", width: 20 },
      { header: "Área", key: "area", width: 25 }, 
      { header: "Departamento", key: "departamento", width: 25 }, 
      { header: "Motivo", key: "motivo_baja", width: 30 },
      { header: "Observaciones", key: "observaciones_baja", width: 40 },
    ];
    
    devices.forEach((device, index) => {
      worksheet.addRow({
        numero: index + 1,
        etiqueta: device.etiqueta || "N/A",
        // Datos del equipo
        nombre_equipo: device.nombre_equipo || "N/A",
        numero_serie: device.numero_serie || "N/A",
        marca: device.marca || "N/A",
        modelo: device.modelo || "N/A",
        // Datos del usuario
        usuario_nombre: device.usuario?.nombre || "N/A",
        usuario_login: device.usuario?.usuario_login || "N/A",
        // Datos técnicos
        ip_equipo: device.ip_equipo || "N/A",
        // Datos generales
        tipo: device.tipo?.nombre || "",
        area: device.area?.nombre || "N/A", 
        departamento: device.area?.departamento?.nombre || "N/A", 
        motivo_baja: device.motivo_baja || "N/A",
        observaciones_baja: device.observaciones_baja || "N/A",
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=dispositivos_inactivos.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al exportar dispositivos inactivos" });
  }
};

export const deleteDevice = async (req, res) => {
  try {
    const oldDevice = await deviceService.getDeviceById(req.params.id);
    if (!oldDevice) return res.status(404).json({ error: "Dispositivo no encontrado" });

    await deviceService.deleteDevice(req.params.id);
    
    res.json({ message: "Dispositivo eliminado" });
  } catch (error) {
    console.error("Error al eliminar dispositivo:", error);
    if (error.code === 'P2003') { 
        return res.status(400).json({ error: "No se puede eliminar el equipo porque tiene registros de mantenimiento asociados. Considere darle de baja." });
    }
    res.status(500).json({ error: "Error al eliminar dispositivo" });
  }
};

export const importDevices = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha subido ningún archivo." });
    }
    
    const { successCount, errors } = await deviceService.importDevicesFromExcel(req.file.buffer);
    
    res.json({ 
      message: `Importación finalizada. Insertados: ${successCount}. Errores: ${errors.length}`,
      errors: errors 
    });

  } catch (error) {
    console.error("Error en importación de equipos:", error);
    res.status(500).json({ error: "Error interno al procesar el archivo Excel." });
  }
};

export const createDevice = async (req, res) => {
  try {
    const { fecha_proxima_revision, garantia_numero_reporte, garantia_notes, ...deviceData } = req.body;
    const estadoActivo = await prisma.deviceStatus.findFirst({ where: { nombre: "Activo" } });
    if (!estadoActivo) return res.status(400).json({ error: 'No existe un estado llamado "Activo" en la base de datos.' });

    const dataToCreate = {
      ...deviceData,
      areaId: deviceData.areaId ? Number(deviceData.areaId) : null,
      usuarioId: deviceData.usuarioId ? Number(deviceData.usuarioId) : null,
      tipoId: deviceData.tipoId ? Number(deviceData.tipoId) : null,
      sistemaOperativoId: deviceData.sistemaOperativoId ? Number(deviceData.sistemaOperativoId) : null,
      fecha_proxima_revision: fecha_proxima_revision || null,
      perfiles_usuario: deviceData.perfiles_usuario || null,
      estadoId: estadoActivo.id,
      garantia_numero_reporte: garantia_numero_reporte || null,
      garantia_notes: garantia_notes || null,
    };
    const newDevice = await deviceService.createDevice(dataToCreate);
    
    if (fecha_proxima_revision) {
      await prisma.maintenance.create({
        data: {
          descripcion: "Revisión preventiva inicial",
          fecha_programada: new Date(fecha_proxima_revision),
          estado: "pendiente",
          deviceId: newDevice.id,
        }
      });
    }
    res.status(201).json(newDevice);
  } catch (error) {
    console.error("Error al crear el dispositivo:", error);
    res.status(500).json({ error: "Error al crear el dispositivo" });
  }
};

export const updateDevice = async (req, res) => {
  try {
    const deviceId = Number(req.params.id);
    const oldDevice = await deviceService.getDeviceById(deviceId);
    if (!oldDevice) return res.status(404).json({ error: "Dispositivo no encontrado" });
    
    const dataToUpdate = { ...req.body };

    if (dataToUpdate.areaId !== undefined) {
        dataToUpdate.areaId = dataToUpdate.areaId ? Number(dataToUpdate.areaId) : null;
    }
    if (dataToUpdate.usuarioId !== undefined) {
        dataToUpdate.usuarioId = dataToUpdate.usuarioId ? Number(dataToUpdate.usuarioId) : null;
    }
    if (dataToUpdate.sistemaOperativoId !== undefined) {
        dataToUpdate.sistemaOperativoId = dataToUpdate.sistemaOperativoId ? Number(dataToUpdate.sistemaOperativoId) : null;
    }
    if (dataToUpdate.tipoId) dataToUpdate.tipoId = Number(dataToUpdate.tipoId);
    if (dataToUpdate.estadoId) dataToUpdate.estadoId = Number(dataToUpdate.estadoId);
    
    if (dataToUpdate.garantia_numero_reporte === "") dataToUpdate.garantia_numero_reporte = null;
    if (dataToUpdate.garantia_notes === "") dataToUpdate.garantia_notes = null;
    
    const disposedStatus = await prisma.deviceStatus.findFirst({ where: { nombre: "Baja" } });
    const disposedStatusId = disposedStatus?.id;
    
    if (oldDevice.estadoId === disposedStatusId && dataToUpdate.estadoId && dataToUpdate.estadoId !== disposedStatusId) {
        return res.status(403).json({ error: "No se puede reactivar un equipo que ya ha sido dado de baja." });
    } else if (oldDevice.estadoId === disposedStatusId) {
        dataToUpdate.estadoId = disposedStatusId;
    } else if (dataToUpdate.estadoId === disposedStatusId) {
        dataToUpdate.fecha_baja = new Date();
    }
    
    const updatedDevice = await deviceService.updateDevice(deviceId, dataToUpdate);
    res.json(updatedDevice);
  } catch (error) {
    console.error("Error al actualizar dispositivo:", error);
    res.status(500).json({ error: "Error al actualizar dispositivo" });
  }
};

export const exportAllDevices = async (req, res) => {
  try {
    const { devices } = await deviceService.getActiveDevices({ skip: 0, take: undefined });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventario Activo");
    
    worksheet.columns = [
      { header: "Etiqueta", key: "etiqueta", width: 20 },
      { header: "Nombre Equipo", key: "nombre_equipo", width: 25 },
      { header: "Tipo", key: "tipo", width: 20 },
      { header: "Marca", key: "marca", width: 20 },
      { header: "Modelo", key: "modelo", width: 20 },
      { header: "N° Serie", key: "numero_serie", width: 25 },
      { header: "Responsable (Jefe)", key: "usuario", width: 30 },
      { header: "Usuario de Login", key: "usuario_login", width: 25 },
      { header: "Perfiles Acceso", key: "perfiles", width: 40 },
      { header: "Área", key: "area", width: 25 },
      { header: "Departamento", key: "departamento", width: 25 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "IP", key: "ip", width: 15 },
      { header: "Sistema Operativo", key: "sistema_operativo", width: 25 },
      { header: "Licencia SO", key: "licencia_so", width: 25 },
      { header: "Version Office", key: "office_version", width: 18 },
      { header: "Tipo Licencia", key: "office_tipo_licencia", width: 18 },
      { header: "N Producto", key: "garantia_numero_producto", width: 25 },
      { header: "Inicio Garantía", key: "garantia_inicio", width: 18 },
      { header: "Fin Garantía", key: "garantia_fin", width: 18 },
      { header: "N° Reporte Manto", key: "garantia_numero_reporte", width: 25 }, 
      { header: "Notas de Garantía", key: "garantia_notes", width: 40 },         
      { header: "¿Tiene Panda?", key: "es_panda", width: 15 },
    ];

    devices.forEach((device) => {
      worksheet.addRow({
        etiqueta: device.etiqueta || "",
        nombre_equipo: device.nombre_equipo || "",
        tipo: device.tipo?.nombre || "N/A",
        marca: device.marca || "",
        modelo: device.modelo || "",
        numero_serie: device.numero_serie || "",
        usuario: device.usuario?.nombre || "N/A",
        usuario_login: device.usuario?.usuario_login || "N/A",
        perfiles: device.perfiles_usuario || "",
        area: device.area?.nombre || "N/A",
        departamento: device.area?.departamento?.nombre || "N/A",
        estado: device.estado?.nombre || "N/A",
        ip: device.ip_equipo || "",
        sistema_operativo: device.sistema_operativo?.nombre || "N/A",
        licencia_so: device.licencia_so || "",
        office_version: device.office_version || "",
        office_tipo_licencia: device.office_tipo_licencia || "",
        garantia_numero_producto: device.garantia_numero_producto || "",
        garantia_inicio: device.garantia_inicio ? new Date(device.garantia_inicio).toLocaleDateString() : "",
        garantia_fin: device.garantia_fin ? new Date(device.garantia_fin).toLocaleDateString() : "",
        garantia_numero_reporte: device.garantia_numero_reporte || "",
        garantia_notes: device.garantia_notes || "",
        es_panda: device.es_panda ? "Sí" : "No",
      });
    });
    worksheet.getRow(1).font = { bold: true };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=inventario_activo.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al exportar inventario" });
  }
};

export const exportCorrectiveAnalysis = async (req, res) => {
    try {
        const { startDate, endDate } = req.query; 
        const analysisData = await deviceService.getExpiredWarrantyAnalysis(startDate, endDate);
        
        const workbook = new ExcelJS.Workbook();
        // Nombre corregido sin caracteres inválidos
        const worksheet = workbook.addWorksheet("Analisis Garantia-Correctivos"); 
        
        worksheet.columns = [
            { header: "Etiqueta", key: "etiqueta", width: 15 },
            { header: "Nombre Equipo", key: "nombre_equipo", width: 30 },
            { header: "N° Serie", key: "numero_serie", width: 25 },
            { header: "Marca", key: "marca", width: 20 },
            { header: "Modelo", key: "modelo", width: 20 },
            { header: "Fin Garantía", key: "garantia_fin", width: 18 },
            { header: "Días Expirado", key: "daysExpired", width: 18 },
            { header: "Correctivos Totales", key: "correctiveCount", width: 25 },
            { header: "Último Correctivo", key: "lastCorrective", width: 20 },
            { header: "Total Horas Manto.", key: "totalHours", width: 20 } 
        ];

        analysisData.forEach((d) => {
            worksheet.addRow({
                etiqueta: d.etiqueta,
                nombre_equipo: d.nombre_equipo,
                numero_serie: d.numero_serie,
                marca: d.marca,
                modelo: d.modelo,
                garantia_fin: d.garantia_fin ? new Date(d.garantia_fin).toLocaleDateString() : "N/A",
                daysExpired: d.daysExpired !== null ? d.daysExpired : "N/A",
                correctiveCount: d.correctiveCount,
                lastCorrective: d.lastCorrective ? new Date(d.lastCorrective).toLocaleDateString() : "N/A",
                totalHours: 0, 
            });
        });

        worksheet.getRow(1).font = { bold: true };
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=analisis_garantia_correctivos.xlsx");
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error al exportar el análisis:", error);
        res.status(500).json({ error: "Error al exportar el análisis de garantía y correctivos." });
    }
};