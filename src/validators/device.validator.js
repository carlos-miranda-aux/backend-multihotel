// src/validators/device.validator.js
import { check } from 'express-validator';
import { validateResult } from '../middlewares/validateHelper.js';

export const validateCreateDevice = [
    check('nombre_equipo')
        .exists().withMessage('El nombre del equipo es requerido')
        .notEmpty().withMessage('El nombre no puede estar vacío')
        .isString(),
    
    check('numero_serie')
        .exists().withMessage('El número de serie es requerido')
        .notEmpty().withMessage('El número de serie no puede estar vacío'),

    check('marca')
        .exists().withMessage('La marca es requerida')
        .notEmpty(),

    check('modelo')
        .exists().withMessage('El modelo es requerido')
        .notEmpty(),

    check('tipoId')
        .exists().withMessage('El Tipo de dispositivo es requerido')
        .isNumeric().withMessage('El ID del tipo debe ser un número'),

    check('estadoId')
        .exists().withMessage('El Estado es requerido')
        .isNumeric().withMessage('El ID del estado debe ser un número'),

    // Campos opcionales pero que si vienen, deben tener formato correcto
    check('ip_equipo')
        .optional({ nullable: true, checkFalsy: true })
        .isIP().withMessage('La dirección IP no tiene un formato válido'),

    check('fecha_proxima_revision')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601().withMessage('La fecha de próxima revisión debe ser una fecha válida (YYYY-MM-DD)'),

    (req, res, next) => validateResult(req, res, next)
];

// Validación para actualizaciones (suele ser más laxa, pero validamos tipos si vienen)
export const validateUpdateDevice = [
    check('nombre_equipo').optional().notEmpty().withMessage('El nombre no puede quedar vacío'),
    check('tipoId').optional().isNumeric(),
    check('estadoId').optional().isNumeric(),
    check('ip_equipo').optional({ nullable: true, checkFalsy: true }).isIP().withMessage('IP inválida'),
    
    (req, res, next) => validateResult(req, res, next)
];