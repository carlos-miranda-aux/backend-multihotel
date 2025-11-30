import * as deviceTypeService from "../services/deviceType.service.js";

export const getDeviceTypes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "nombre";
    const order = req.query.order || "asc";
    const skip = (page - 1) * limit;

    if (isNaN(limit) || limit === 0 || req.query.limit === '0') {
        const allTypes = await deviceTypeService.getAllDeviceTypes();
        return res.json(allTypes);
    }

    const { deviceTypes, totalCount } = await deviceTypeService.getDeviceTypes({ 
        skip, 
        take: limit,
        sortBy,
        order
    });

    res.json({
      data: deviceTypes,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) { 
    next(error); 
  }
};

export const getDeviceType = async (req, res, next) => {
  try {
    const type = await deviceTypeService.getDeviceTypeById(req.params.id);
    if (!type) return res.status(404).json({ message: "Type not found" });
    res.json(type);
  } catch (error) { 
    next(error); 
  }
};

export const createDeviceType = async (req, res, next) => {
  try {
    const type = await deviceTypeService.createDeviceType(req.body);
    res.status(201).json(type);
  } catch (error) { 
    next(error); 
  }
};

export const updateDeviceType = async (req, res, next) => {
  try {
    const oldType = await deviceTypeService.getDeviceTypeById(req.params.id);
    if (!oldType) return res.status(404).json({ message: "Type not found" });
    const type = await deviceTypeService.updateDeviceType(req.params.id, req.body);
    res.json(type);
  } catch (error) { 
    next(error); 
  }
};

export const deleteDeviceType = async (req, res, next) => {
  try {
    const oldType = await deviceTypeService.getDeviceTypeById(req.params.id);
    if (!oldType) return res.status(404).json({ message: "Type not found" });
    await deviceTypeService.deleteDeviceType(req.params.id);
    res.json({ message: "Type deleted" });
  } catch (error) {
    next(error);
  }
};