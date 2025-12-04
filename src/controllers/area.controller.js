import * as areaService from "../services/area.service.js";

export const getAreas = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "nombre";
    const order = req.query.order || "asc";
    const skip = (page - 1) * limit;

    if (isNaN(limit) || limit === 0 || req.query.limit === undefined || req.query.limit === '0') {
        const areas = await areaService.getAllAreas(req.user); 
        return res.json(areas);
    }
    
    const { areas, totalCount } = await areaService.getAreas({ skip, take: limit, sortBy, order }, req.user);

    res.json({ data: areas, totalCount: totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
  } catch (error) { 
    next(error); 
  }
};

export const getArea = async (req, res, next) => {
  try {
    const area = await areaService.getAreaById(req.params.id, req.user);
    if (!area) return res.status(404).json({ message: "Area not found" });
    res.json(area);
  } catch (error) { 
    next(error); 
  }
};

export const createArea = async (req, res, next) => {
  try {
    const area = await areaService.createArea(req.body, req.user);
    res.status(201).json(area);
  } catch (error) {
    next(error);
  }
};

export const updateArea = async (req, res, next) => {
  try {
    const area = await areaService.updateArea(req.params.id, req.body, req.user);
    res.json(area);
  } catch (error) {
    next(error);
  }
};

export const deleteArea = async (req, res, next) => {
  try {
    await areaService.deleteArea(req.params.id, req.user);
    res.json({ message: "Area deleted" });
  } catch (error) {
    next(error);
  }
};