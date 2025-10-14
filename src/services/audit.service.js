// src/services/audit.service.js
import prisma from "../PrismaClient.js"

export const logAction = async (userId, action, resource, resourceId, oldData = null, newData = null) => {
  try {
    // 🔹 Convertimos los objetos a JSON de manera segura
    const stringifiedOldData = oldData ? JSON.stringify(oldData) : null;
    const stringifiedNewData = newData ? JSON.stringify(newData) : null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldData: stringifiedOldData,
        newData: stringifiedNewData,
      },
    });
  } catch (error) {
    console.error("Error guardando en auditoría:", error);
  }
};