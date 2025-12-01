// src/validators/device.validator.js
import { check } from 'express-validator';
import { validateResult } from '../middlewares/validateHelper.js';

export const validateCreateDevice = [
    check('nombre_equipo')
        .exists().withMessage('El nombre del equipo es obligatorio.')
        .notEmpty().withMessage('El nombre no puede estar vacío.'),
    
    check('numero_serie')
        .exists().withMessage('El número de serie es obligatorio.')
        .notEmpty().withMessage('Escribe el número de serie.'),

    check('marca')
        .exists().withMessage('La marca es obligatoria.')
        .notEmpty().withMessage('Escribe la marca del equipo.'),
        
    check('modelo')
        .exists().withMessage('El modelo es obligatorio.')
        .notEmpty().withMessage('Escribe el modelo del equipo.'),

    // Mejoramos los mensajes de selección
    check('tipoId')
        .exists().withMessage('Debes seleccionar un Tipo de dispositivo.')
        .isInt().withMessage('Selección de Tipo inválida. Escoge una opción de la lista.'),

    check('ip_equipo')
        .exists().withMessage('La dirección IP es obligatoria.')
        .custom((value) => {
            if (!value) throw new Error('La IP no puede estar vacía.');
            const valStr = value.toString().trim();
            
            // 1. DHCP
            if (valStr.toUpperCase() === 'DHCP') return true;
            
            // 2. IPv4 Regex simple
            const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            
            if (ipv4Regex.test(valStr)) return true;

            throw new Error('Formato de IP incorrecto. Usa números (ej. 10.20.80.123) o escribe "DHCP".');
        }),

    check('fecha_proxima_revision')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601().withMessage('La fecha de revisión no tiene un formato válido.'),

    (req, res, next) => validateResult(req, res, next)
];

export const validateUpdateDevice = [
    check('nombre_equipo')
        .optional()
        .notEmpty().withMessage('El nombre no puede quedar vacío.'),
    
    check('tipoId')
        .optional()
        .isInt().withMessage('Selección de Tipo inválida.'),
    
    check('estadoId')
        .optional()
        .isInt().withMessage('Selección de Estado inválida.'),
    
    check('ip_equipo')
        .optional({ nullable: true, checkFalsy: true })
        .custom((value) => {
            const valStr = value.toString().trim();
            if (valStr.toUpperCase() === 'DHCP') return true;
            const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            if (ipv4Regex.test(valStr)) return true;
            throw new Error('Formato de IP incorrecto o "DHCP".');
        }),
    
    (req, res, next) => validateResult(req, res, next)
];