// src/config/constants.js

export const ROLES = {
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  USER: "USER",
};

export const DEVICE_STATUS = {
  ACTIVE: "Activo",
  DISPOSED: "Baja", // Dado de baja
};

export const MAINTENANCE_STATUS = {
  PENDING: "pendiente",
  COMPLETED: "realizado",
  CANCELLED: "cancelado",
};

export const MAINTENANCE_TYPE = {
  PREVENTIVE: "Preventivo",
  CORRECTIVE: "Correctivo",
};

export const DEFAULTS = {
  DEVICE_TYPE: "Estación",
  BRAND: "Genérico",
  MODEL: "Genérico",
  IP: "DHCP",
};