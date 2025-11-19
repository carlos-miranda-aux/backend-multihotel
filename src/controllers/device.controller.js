// src/controllers/device.controller.js
import * as deviceService from "../services/device.service.js";
import ExcelJS from "exceljs";
import prisma from "../PrismaClient.js";

export const getDevices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || ""; // 👈 Capturamos búsqueda
    const skip = (page - 1) * limit;

    const { devices, totalCount } = await deviceService.getActiveDevices({ skip, take: limit, search });
    
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

// ... (Resto de funciones: getAllActiveDeviceNames, getDevice, createDevice, updateDevice, etc. SIN CAMBIOS)
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

export const createDevice = async (req, res) => {
  try {
    const { fecha_proxima_revision, ...deviceData } = req.body;
    const estadoActivo = await prisma.deviceStatus.findFirst({ where: { nombre: "Activo" } });
    if (!estadoActivo) return res.status(400).json({ error: 'No existe un estado llamado "Activo" en la base de datos.' });

    const dataToCreate = {
      ...deviceData,
      areaId: deviceData.areaId ? Number(deviceData.areaId) : null, // 👈 CORRECCIÓN: usar areaId
      usuarioId: deviceData.usuarioId ? Number(deviceData.usuarioId) : null,
      tipoId: deviceData.tipoId ? Number(deviceData.tipoId) : null,
      sistemaOperativoId: deviceData.sistemaOperativoId ? Number(deviceData.sistemaOperativoId) : null,
      fecha_proxima_revision: fecha_proxima_revision || null,
      estadoId: estadoActivo.id,
    };
    const newDevice = await deviceService.createDevice(dataToCreate);
    if (fecha_proxima_revision) {
      await prisma.maintenance.create({
        data: {
          descripcion: "Revisión preventiva inicial (creada automáticamente)",
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
    
    // CORRECCIÓN: Asegurar que el areaId se convierta a número
    if (dataToUpdate.areaId !== undefined) {
        dataToUpdate.areaId = dataToUpdate.areaId ? Number(dataToUpdate.areaId) : null;
    }
    
    const disposedStatus = await prisma.deviceStatus.findFirst({ where: { nombre: "Baja" } });
    const disposedStatusId = disposedStatus?.id;
    const isAlreadyBaja = oldDevice.estadoId === disposedStatusId;
    const isTryingToChangeStatus = dataToUpdate.estadoId && dataToUpdate.estadoId !== oldDevice.estadoId;
    const isTryingToReactivate = isAlreadyBaja && isTryingToChangeStatus;

    if (isTryingToReactivate) return res.status(403).json({ error: "No se puede reactivar un equipo que ya ha sido dado de baja." });
    else if (isAlreadyBaja) dataToUpdate.estadoId = disposedStatusId;
    else if (dataToUpdate.estadoId === disposedStatusId) dataToUpdate.fecha_baja = new Date();
    
    const { fecha_proxima_revision } = dataToUpdate;
    const oldRevisionDate = oldDevice.fecha_proxima_revision ? new Date(oldDevice.fecha_proxima_revision).toISOString().split('T')[0] : null;
    
    if (fecha_proxima_revision && fecha_proxima_revision !== oldRevisionDate) {
      const existingPreventiveMaint = await prisma.maintenance.findFirst({
        where: { deviceId: oldDevice.id, estado: "pendiente", descripcion: { contains: "Revisión preventiva" } }
      });
      if (existingPreventiveMaint) {
        await prisma.maintenance.update({
          where: { id: existingPreventiveMaint.id },
          data: { fecha_programada: new Date(fecha_proxima_revision), descripcion: "Revisión preventiva (fecha actualizada)" }
        });
      } else {
        await prisma.maintenance.create({
            data: {
                descripcion: "Revisión preventiva (actualizada)",
                fecha_programada: new Date(fecha_proxima_revision),
                estado: "pendiente",
                deviceId: oldDevice.id,
            }
        });
      }
    }
    const updatedDevice = await deviceService.updateDevice(deviceId, dataToUpdate);
    res.json(updatedDevice);
  } catch (error) {
    console.error("Error al actualizar dispositivo:", error);
    res.status(500).json({ error: "Error al actualizar dispositivo" });
  }
};

export const exportInactiveDevices = async (req, res) => {
  try {
    const { devices } = await deviceService.getInactiveDevices({ skip: 0, take: undefined }); 
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dispositivos Inactivos");
    worksheet.columns = [
      { header: "N° Equipo", key: "numero", width: 12 },
      { header: "Etiqueta", key: "etiqueta", width: 20 },
      { header: "Tipo", key: "tipo", width: 20 },
      { header: "Marca", key: "marca", width: 20 },
      { header: "Modelo", key: "modelo", width: 20 },
      { header: "Área", key: "area", width: 25 }, // 👈 CAMBIO: Agregar área
      { header: "Departamento", key: "departamento", width: 25 }, // 👈 CAMBIO: Agregar departamento
      { header: "Motivo", key: "motivo_baja", width: 30 },
      { header: "Observaciones", key: "observaciones_baja", width: 30 },
    ];
    devices.forEach((device, index) => {
      worksheet.addRow({
        numero: index + 1,
        etiqueta: device.etiqueta || "",
        tipo: device.tipo?.nombre || "",
        marca: device.marca || "",
        modelo: device.modelo || "",
        area: device.area?.nombre || "N/A", // 👈 CAMBIO
        departamento: device.area?.departamento?.nombre || "N/A", // 👈 CAMBIO
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
      { header: "Usuario Asignado", key: "usuario", width: 30 },
      { header: "Área", key: "area", width: 25 }, // 👈 CAMBIO: Agregar área
      { header: "Departamento", key: "departamento", width: 25 }, // 👈 CAMBIO: Agregar departamento
      { header: "Estado", key: "estado", width: 15 },
      { header: "Sistema Operativo", key: "so", width: 25 },
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
        area: device.area?.nombre || "N/A", // 👈 CAMBIO
        departamento: device.area?.departamento?.nombre || "N/A", // 👈 CAMBIO
        estado: device.estado?.nombre || "N/A",
        so: device.sistema_operativo?.nombre || "N/A",
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

export const deleteDevice = async (req, res) => {
  try {
    // 1. Verificar si existe y precargar información
    const oldDevice = await deviceService.getDeviceById(req.params.id);
    if (!oldDevice) return res.status(404).json({ error: "Dispositivo no encontrado" });

    // 2. Intenta borrar el dispositivo
    await deviceService.deleteDevice(req.params.id);
    
    res.json({ message: "Dispositivo eliminado" });
  } catch (error) {
    console.error("Error al eliminar dispositivo:", error);
    // 3. Manejar error de llave foránea (equipo con historial)
    if (error.code === 'P2003') { 
        return res.status(400).json({ error: "No se puede eliminar el equipo porque tiene registros de mantenimiento asociados. Considere darle de baja." });
    }
    res.status(500).json({ error: "Error al eliminar dispositivo" });
  }
};