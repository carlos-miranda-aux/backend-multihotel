// src/validators/device.validator.js
import { check } from 'express-validator';
import { validateResult } from '../middlewares/validateHelper.js';

export const validateCreateDevice = [
    check('nombre_equipo')
        .exists().withMessage('El nombre del equipo es requerido')
        .notEmpty().withMessage('El nombre no puede estar vacío'),
    
    check('numero_serie')
        .exists().withMessage('El número de serie es requerido')
        .notEmpty().withMessage('El número de serie no puede estar vacío'),

    check('marca').exists().withMessage('La marca es requerida').notEmpty(),
    check('modelo').exists().withMessage('El modelo es requerido').notEmpty(),

    check('tipoId')
        .exists().withMessage('Selecciona un Tipo de dispositivo')
        .isNumeric().withMessage('Tipo inválido'),

    // ❌ ELIMINADO: check('estadoId')... 
    // No validamos estadoId aquí porque el controlador lo asigna automáticamente como 'Activo'.

    // 👇 VALIDACIÓN DE IP (Misma lógica, asegurando retorno booleano)
    check('ip_equipo')
        .exists().withMessage('La IP es requerida')
        .custom((value) => {
            if (!value) throw new Error('La IP no puede estar vacía');
            const valStr = value.toString().trim();
            
            // 1. DHCP
            if (valStr.toUpperCase() === 'DHCP') return true;
            
            // 2. IPv4
            const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            
            if (ipv4Regex.test(valStr)) return true;

            throw new Error('IP inválida (ej. 10.20.80.123) o "DHCP"');
        }),

    check('fecha_proxima_revision')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601().withMessage('Fecha de revisión inválida'),

    (req, res, next) => validateResult(req, res, next)
];

export const validateUpdateDevice = [
    check('nombre_equipo').optional().notEmpty().withMessage('El nombre no puede quedar vacío'),
    check('tipoId').optional().isNumeric(),
    check('estadoId').optional().isNumeric(), // En update SI validamos estado, porque aquí sí se puede cambiar
    
    check('ip_equipo')
        .optional({ nullable: true, checkFalsy: true })
        .custom((value) => {
            const valStr = value.toString().trim();
            if (valStr.toUpperCase() === 'DHCP') return true;
            const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            if (ipv4Regex.test(valStr)) return true;
            throw new Error('IP inválida o "DHCP"');
        }),
    
    (req, res, next) => validateResult(req, res, next)
];