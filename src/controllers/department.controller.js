import * as departmentService from '../services/department.service.js';

export const getDepartments = async (req, res) => {
  try {
    const departments = await departmentService.getDepartments();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDepartment = async (req, res) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const department = await departmentService.createDepartment(req.body);
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body);
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    await departmentService.deleteDepartment(req.params.id);
    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
