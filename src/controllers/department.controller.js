import * as departmentService from "../services/department.service.js";

export const getDepartments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "nombre";
    const order = req.query.order || "asc";
    const skip = (page - 1) * limit;

    // Si limit es 0, devolvemos todo (pero filtrado por el hotel del usuario)
    if (isNaN(limit) || limit === 0 || req.query.limit === undefined || req.query.limit === '0') {
        const departments = await departmentService.getAllDepartments(req.user); // 👈 req.user
        return res.json(departments);
    }
    
    const { departments, totalCount } = await departmentService.getDepartments({ skip, take: limit, sortBy, order }, req.user); // 👈 req.user

    res.json({ data: departments, totalCount: totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
  } catch (error) { 
    next(error); 
  }
};

export const getDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id, req.user);
    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json(department);
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    // El servicio tomará el hotelId del usuario automáticamente
    const department = await departmentService.createDepartment(req.body, req.user);
    res.status(201).json(department);
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body, req.user);
    res.json(department);
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    await departmentService.deleteDepartment(req.params.id, req.user);
    res.json({ message: "Department deleted" });
  } catch (error) {
    next(error);
  }
};