// src/middlewares/validateHelper.js
import { validationResult } from 'express-validator';

export const validateResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Retornamos solo el primer error o un mapa de ellos para el frontend
        return res.status(400).json({ 
            error: "Datos inválidos", 
            details: errors.array().map(e => ({ field: e.path, message: e.msg })) 
        });
    }
    next();
};