import prisma from "../PrismaClient.js";
import { ROLES } from "../config/constants.js";

export const getAvailableHotels = async (req, res, next) => {
  try {
    const user = req.user;

    // Si es ROOT o CORP_VIEWER, devolvemos TODOS los hoteles activos
    if (user.rol === ROLES.ROOT || user.rol === ROLES.CORP_VIEWER) {
      const hotels = await prisma.hotel.findMany({
        where: { deletedAt: null, activo: true },
        select: { id: true, nombre: true, codigo: true }
      });
      return res.json(hotels);
    }

    // Si es usuario regional/local, devolvemos solo los que tiene asignados en su token/relación
    // Nota: req.user.hotels viene del middleware verifyToken
    if (user.hotels && user.hotels.length > 0) {
        return res.json(user.hotels);
    }

    // Si no tiene hoteles asignados (caso raro)
    return res.json([]);

  } catch (error) {
    next(error);
  }
};
