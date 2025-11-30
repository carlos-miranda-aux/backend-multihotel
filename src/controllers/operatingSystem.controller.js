import * as operatingSystemService from "../services/operatingSystem.service.js";

export const getOperatingSystems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "nombre";
    const order = req.query.order || "asc";
    const skip = (page - 1) * limit;

    // Selector: Si limit es 0, devolvemos todo sin paginar
    if (isNaN(limit) || limit === 0 || req.query.limit === '0') {
        const allOs = await operatingSystemService.getAllOperatingSystems();
        return res.json(allOs);
    }

    // Tabla: Paginado y ordenado
    const { operatingSystems, totalCount } = await operatingSystemService.getOperatingSystems({ 
        skip, 
        take: limit, 
        sortBy, 
        order 
    });

    res.json({
      data: operatingSystems,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    next(error);
  }
};

export const getOperatingSystem = async (req, res, next) => {
  try {
    const os = await operatingSystemService.getOperatingSystemById(req.params.id);
    if (!os) return res.status(404).json({ message: "Operating System not found" });
    res.json(os);
  } catch (error) {
    next(error);
  }
};

export const createOperatingSystem = async (req, res, next) => {
  try {
    const os = await operatingSystemService.createOperatingSystem(req.body);
    res.status(201).json(os);
  } catch (error) {
    next(error);
  }
};

export const updateOperatingSystem = async (req, res, next) => {
  try {
    const oldOs = await operatingSystemService.getOperatingSystemById(req.params.id);
    if (!oldOs) return res.status(404).json({ message: "Operating System not found" });
    const os = await operatingSystemService.updateOperatingSystem(req.params.id, req.body);
    res.json(os);
  } catch (error) {
    next(error);
  }
};

export const deleteOperatingSystem = async (req, res, next) => {
  try {
    const oldOs = await operatingSystemService.getOperatingSystemById(req.params.id);
    if (!oldOs) return res.status(404).json({ message: "Operating System not found" });
    await operatingSystemService.deleteOperatingSystem(req.params.id);
    res.json({ message: "Operating System deleted" });
  } catch (error) {
    next(error);
  }
};