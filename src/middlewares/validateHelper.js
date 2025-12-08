import { validationResult } from 'express-validator';

export const validateResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: "Datos inválidos", 
            details: errors.array().map(e => ({ field: e.path, message: e.msg })) 
        });
    }
    next();
};