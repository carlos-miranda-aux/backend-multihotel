import * as deviceService from "../services/device.service.js";
import ExcelJS from "exceljs";
import prisma from "../PrismaClient.js";
import { DEVICE_STATUS } from "../config/constants.js"; 
// Nuevos imports para docxtemplater
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getDevices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || ""; 
    const filter = req.query.filter || ""; 
    const sortBy = req.query.sortBy || "id";
    const order = req.query.order || "desc";

    const skip = (page - 1) * limit;

    const { devices, totalCount } = await deviceService.getActiveDevices({ 
        skip, 
        take: limit, 
        search, 
        filter,
        sortBy,
        order
    }, req.user);
    
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

export const getAllActiveDeviceNames = async (req, res, next) => {
    try {

      const devices = await deviceService.getAllActiveDeviceNames(req.user);
      res.json(devices); 
    } catch (error) {
      next(error);
    }
};
  
export const getDevice = async (req, res, next) => {
    try {

        const device = await deviceService.getDeviceById(req.params.id, req.user);
        if (!device) return res.status(404).json({ error: "Dispositivo no encontrado o no tienes acceso a este hotel." });
        res.json(device);
    } catch (error) {
        next(error);
    }
};

export const getPandaStatus = async (req, res, next) => {
    try {

        const counts = await deviceService.getPandaStatusCounts(req.user);
        res.json(counts);
    } catch (error) {
        next(error);
    }
};

export const getDashboardData = async (req, res, next) => {
    try {

        const stats = await deviceService.getDashboardStats(req.user);
        res.json(stats);
    } catch (error) {
        next(error);
    }
};

export const createDevice = async (req, res, next) => {
    try {
      const { fecha_proxima_revision, garantia_numero_reporte, garantia_notes, ...deviceData } = req.body;
      
      const estadoActivo = await prisma.deviceStatus.findFirst({ where: { nombre: DEVICE_STATUS.ACTIVE } });
      
      if (!estadoActivo) return res.status(400).json({ error: `No existe un estado llamado "${DEVICE_STATUS.ACTIVE}" en la base de datos.` });
  
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
        motivo_baja: null, 
        observaciones_baja: null 
      };

      const newDevice = await deviceService.createDevice(dataToCreate, req.user);
      
      if (fecha_proxima_revision) {

        await prisma.maintenance.create({
          data: {
            descripcion: "Revisión preventiva inicial",
            fecha_programada: new Date(fecha_proxima_revision),
            estado: "pendiente",
            deviceId: newDevice.id,
            hotelId: newDevice.hotelId,
            diagnostico: "Programado", 
            acciones_realizadas: "Pendiente de revisión",
            observaciones: ""
          }
        });
      }
      res.status(201).json(newDevice);
    } catch (error) {
      next(error);
    }
};

export const updateDevice = async (req, res, next) => {
    try {
      const deviceId = Number(req.params.id);
      
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
      
      const updatedDevice = await deviceService.updateDevice(deviceId, dataToUpdate, req.user);
      res.json(updatedDevice);

    } catch (error) {
      next(error);
    }
};

export const deleteDevice = async (req, res, next) => {
    try {
      await deviceService.deleteDevice(req.params.id, req.user);
      
      res.json({ message: "Dispositivo eliminado" });
    } catch (error) {
      next(error);
    }
};

export const exportInactiveDevices = async (req, res, next) => {
    try {
      // Capturamos fechas opcionales del query params
      const { startDate, endDate } = req.query;

      const { devices } = await deviceService.getInactiveDevices({ 
          skip: 0, 
          take: undefined, 
          startDate, 
          endDate 
      }, req.user); 
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Bajas de Equipos");

      worksheet.columns = [
        { header: "N°", key: "numero", width: 10 },
        { header: "Etiqueta", key: "etiqueta", width: 15 },
        { header: "Nombre Equipo", key: "nombre_equipo", width: 25 },
        { header: "N° Serie", key: "numero_serie", width: 25 },
        { header: "Marca", key: "marca", width: 15 },
        { header: "Modelo", key: "modelo", width: 20 },
        { header: "Usuario Asignado", key: "usuario_nombre", width: 30 },
        { header: "Usuario Login", key: "usuario_login", width: 20 },
        { header: "IP", key: "ip_equipo", width: 15 },
        { header: "Tipo", key: "tipo", width: 20 },
        { header: "Área", key: "area", width: 25 }, 
        { header: "Departamento", key: "departamento", width: 25 }, 
        { header: "Motivo", key: "motivo_baja", width: 30 },
        { header: "Observaciones", key: "observaciones_baja", width: 40 },
        { header: "Fecha Baja", key: "fecha_baja", width: 15 }, // Agregado para referencia
      ];
      
      devices.forEach((device, index) => {
        worksheet.addRow({
          numero: index + 1,
          etiqueta: device.etiqueta || "N/A",
          nombre_equipo: device.nombre_equipo || "N/A",
          numero_serie: device.numero_serie || "N/A",
          marca: device.marca || "N/A",
          modelo: device.modelo || "N/A",
          usuario_nombre: device.usuario?.nombre || "N/A",
          usuario_login: device.usuario?.usuario_login || "N/A",
          ip_equipo: device.ip_equipo || "N/A",
          tipo: device.tipo?.nombre || "",
          area: device.area?.nombre || "N/A", 
          departamento: device.area?.departamento?.nombre || "N/A", 
          motivo_baja: device.motivo_baja || "N/A",
          observaciones_baja: device.observaciones_baja || "N/A",
          fecha_baja: device.fecha_baja ? new Date(device.fecha_baja).toLocaleDateString() : "N/A"
        });
      });
  
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { horizontal: "center" };
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=dispositivos_inactivos.xlsx");
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
};

export const exportAllDevices = async (req, res, next) => {
    try {
      const { devices } = await deviceService.getActiveDevices({ skip: 0, take: undefined }, req.user);
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
      next(error);
    }
};

export const importDevices = async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se ha subido ningún archivo." });
      }
      
      const { successCount, errors } = await deviceService.importDevicesFromExcel(req.file.buffer, req.user);
      
      res.json({ 
        message: `Importación finalizada. Insertados: ${successCount}. Errores: ${errors.length}`,
        errors: errors 
      });
  
    } catch (error) {
      next(error);
    }
};

export const exportCorrectiveAnalysis = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query; 

        const analysisData = await deviceService.getExpiredWarrantyAnalysis(startDate, endDate, req.user);

        const workbook = new ExcelJS.Workbook();
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
        next(error);
    }
};

export const exportResguardo = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const device = await deviceService.getDeviceById(id, req.user);

        if (!device) {
            return res.status(404).json({ error: "Dispositivo no encontrado o acceso denegado." });
        }

        const templatePath = path.resolve(__dirname, "../templates/resguardo_template.docx");
        
        if (!fs.existsSync(templatePath)) {
            return res.status(500).json({ error: "No se encontró la plantilla 'resguardo_template.docx' en src/templates/." });
        }

        const content = fs.readFileSync(templatePath, "binary");

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        const today = new Date();
        const optionsMonth = { month: 'long' }; 
        const mesActual = today.toLocaleDateString('es-MX', optionsMonth);

        const tipoEquipo = device.tipo?.nombre ? device.tipo.nombre.toUpperCase() : "EQUIPO";
        
        // Logica para obtener la ciudad desde el hotel, con fallback a direccion o texto default
        let ubicacion = "Cancún, Quintana Roo"; 
        if (device.hotel) {
            if (device.hotel.ciudad) {
                ubicacion = device.hotel.ciudad;
            } else if (device.hotel.direccion) {
                ubicacion = device.hotel.direccion; 
            }
        }

        const data = {
            lugar: ubicacion, 
            dia: today.getDate(),
            mes: mesActual,
            año: today.getFullYear(),
            
            tipo: tipoEquipo, 
            marca: device.marca || "GENÉRICA",
            modelo: device.modelo || "GENÉRICO",
            color: "NA", 
            serie: device.numero_serie || "S/N",
            nombre_empleado: device.usuario ? device.usuario.nombre.toUpperCase() : "______________________",
        };

        doc.render(data);

        const buf = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
        });

        const fileName = `Resguardo_${tipoEquipo}_${device.nombre_equipo}.docx`.replace(/ /g, "_");
        
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.send(buf);

    } catch (error) {
        console.error("Error generando resguardo:", error);
        
        if (error.properties && error.properties.errors) {
            const errorMessages = error.properties.errors.map(e => e.message).join(", ");
            console.error("Detalle error plantilla:", errorMessages);
            return res.status(400).json({ error: `Error en la plantilla Word: ${errorMessages}` });
        }
        
        next(error);
    }
};