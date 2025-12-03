// src/config/constants.js

export const ROLES = {
  ROOT: "ROOT",  //Dev
  CORP_VIEWER: "CORP_VIEWER",  //Global lecture
  HOTEL_ADMIN: "HOTEL_ADMIN",  //admin local
  HOTEL_AUX: "HOTEL_AUX",      //asistente local
  HOTEL_GUEST: "HOTEL_GUEST",  //inivtado (only lecture)

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