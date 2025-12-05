import prisma from "../PrismaClient.js";
import * as hotelService from "../services/hotel.service.js";
import { ROLES } from "../config/constants.js";

// --- Métodos existentes ---
export const getAvailableHotels = async (req, res, next) => {
  try {
    const user = req.user;
    if (user.rol === ROLES.ROOT || user.rol === ROLES.CORP_VIEWER) {
      const hotels = await prisma.hotel.findMany({
        where: { deletedAt: null, activo: true },
        select: { id: true, nombre: true, codigo: true }
      });
      return res.json(hotels);
    }
    if (user.hotels && user.hotels.length > 0) {
        return res.json(user.hotels);
    }
    return res.json([]);
  } catch (error) {
    next(error);
  }
};

// --- Nuevos métodos CRUD para ROOT ---

export const getAllHotelsAdmin = async (req, res, next) => {
    try {
        const hotels = await hotelService.getAllHotels();
        res.json(hotels);
    } catch (error) { next(error); }
};

export const createHotel = async (req, res, next) => {
    try {
        const hotel = await hotelService.createHotel(req.body, req.user);
        res.status(201).json(hotel);
    } catch (error) { next(error); }
};

export const updateHotel = async (req, res, next) => {
    try {
        const hotel = await hotelService.updateHotel(req.params.id, req.body, req.user);
        res.json(hotel);
    } catch (error) { next(error); }
};

export const deleteHotel = async (req, res, next) => {
    try {
        await hotelService.deleteHotel(req.params.id, req.user);
        res.json({ message: "Hotel eliminado correctamente" });
    } catch (error) { next(error); }
};