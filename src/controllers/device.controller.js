// controllers/device.controller.js
import * as deviceService from "../services/device.service.js";
// (Importaciones de email y maintenanceService eliminadas)
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

// 👇 --- FUNCIÓN CON LÓGICA DE FASE 1 (PERO SIN EMAIL) --- 👇
export const createDevice = async (req, res) => {
  try {
    const { fecha_proxima_revision, ...deviceData } = req.body;
    
    const estadoActivo = await prisma.deviceStatus.findFirst({
      where: { nombre: "Activo" },
    });

    if (!estadoActivo) {
      return res.status(400).json({ error: 'No existe un estado llamado "Activo" en la base de datos.' });
    }

    const dataToCreate = {
      ...deviceData,
      departamentoId: deviceData.departamentoId ? Number(deviceData.departamentoId) : null,
      usuarioId: deviceData.usuarioId ? Number(deviceData.usuarioId) : null,
      tipoId: deviceData.tipoId ? Number(deviceData.tipoId) : null,
      sistemaOperativoId: deviceData.sistemaOperativoId ? Number(deviceData.sistemaOperativoId) : null,
      fecha_proxima_revision: fecha_proxima_revision || null,
      estadoId: estadoActivo.id,
    };

    const newDevice = await deviceService.createDevice(dataToCreate);

    // ESTA ES LA LÓGICA DE LA FASE 1 (SE QUEDA)
    if (fecha_proxima_revision) {
      await prisma.maintenance.create({
        data: {
          descripcion: "Revisión preventiva inicial (creada automáticamente)",
          fecha_programada: new Date(fecha_proxima_revision),
          estado: "pendiente",
          deviceId: newDevice.id,
        }
      });
      // (Lógica de email eliminada)
    }

    res.status(201).json(newDevice);
  } catch (error) {
    console.error("Error al crear el dispositivo:", error);
    res.status(500).json({ error: "Error al crear el dispositivo" });
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

export const exportAllDevices = async (req, res) => {
  try {
    const devices = await deviceService.getActiveDevices();
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
      { header: "Departamento", key: "departamento", width: 25 },
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
        departamento: device.departamento?.nombre || "N/A",
        estado: device.estado?.nombre || "N/A",
        so: device.sistema_operativo?.nombre || "N/A",
      });
    });

    worksheet.getRow(1).font = { bold: true };
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventario_activo.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al exportar inventario" });
  }
};

export const updateDevice = async (req, res) => {
  try {
    const oldDevice = await deviceService.getDeviceById(req.params.id);
    if (!oldDevice) return res.status(404).json({ error: "Dispositivo no encontrado" });

    const dataToUpdate = { ...req.body };

    const disposedStatus = await prisma.deviceStatus.findFirst({
        where: { nombre: "Baja" },
    });

    if (disposedStatus) {
        if (dataToUpdate.estadoId === disposedStatus.id && !oldDevice.fecha_baja) {
            dataToUpdate.fecha_baja = new Date();
        } else if (dataToUpdate.estadoId !== disposedStatus.id && oldDevice.fecha_baja) {
            dataToUpdate.fecha_baja = null;
        }
    }

    const { fecha_proxima_revision } = dataToUpdate;
    const oldRevisionDate = oldDevice.fecha_proxima_revision ? new Date(oldDevice.fecha_proxima_revision).toISOString().split('T')[0] : null;

    // 👇 --- INICIO DE LA LÓGICA CORREGIDA --- 👇
    if (fecha_proxima_revision && fecha_proxima_revision !== oldRevisionDate) {

      // 1. Buscar si ya existe una revisión preventiva PENDIENTE para este equipo
      const existingPreventiveMaint = await prisma.maintenance.findFirst({
        where: {
          deviceId: oldDevice.id,
          estado: "pendiente",
          // Usamos 'contains' para encontrar la revisión automática
          descripcion: {
            contains: "Revisión preventiva" 
          }
        }
      });

      if (existingPreventiveMaint) {
        // 2. Si existe, ACTUALIZA la fecha
        await prisma.maintenance.update({
          where: { id: existingPreventiveMaint.id },
          data: {
            fecha_programada: new Date(fecha_proxima_revision),
            descripcion: "Revisión preventiva (fecha actualizada)"
          }
        });
      } else {
        // 3. Si no existe, CREA una nueva
        await prisma.maintenance.create({
            data: {
                descripcion: "Revisión preventiva (actualizada)",
                fecha_programada: new Date(fecha_proxima_revision),
                estado: "pendiente",
                deviceId: oldDevice.id,
            }
        });
      }
      // (Lógica de email eliminada)
    }
    // 👆 --- FIN DE LA LÓGICA CORREGIDA --- 👆

    const updatedDevice = await deviceService.updateDevice(req.params.id, dataToUpdate);

    res.json(updatedDevice);
  } catch (error) {
    console.error("Error al actualizar dispositivo:", error);
    res.status(500).json({ error: "Error al actualizar dispositivo" });
  }
};