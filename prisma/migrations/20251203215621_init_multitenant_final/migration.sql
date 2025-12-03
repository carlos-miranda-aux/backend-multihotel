/*
  Warnings:

  - You are about to alter the column `rol` on the `usersistema` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[nombre,departamentoId,hotelId]` on the table `Area` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre,hotelId]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[numero_serie,hotelId]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hotelId` to the `Area` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotelId` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotelId` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotelId` to the `Maintenance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotelId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Area_nombre_departamentoId_key` ON `area`;

-- DropIndex
DROP INDEX `AuditLog_createdAt_idx` ON `auditlog`;

-- DropIndex
DROP INDEX `AuditLog_entity_entityId_idx` ON `auditlog`;

-- DropIndex
DROP INDEX `Department_nombre_key` ON `department`;

-- DropIndex
DROP INDEX `Device_numero_serie_key` ON `device`;

-- AlterTable
ALTER TABLE `area` ADD COLUMN `hotelId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `auditlog` ADD COLUMN `hotelId` INTEGER NULL;

-- AlterTable
ALTER TABLE `department` ADD COLUMN `hotelId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `device` ADD COLUMN `hotelId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `maintenance` ADD COLUMN `hotelId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `hotelId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `usersistema` ADD COLUMN `hotelId` INTEGER NULL,
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `rol` ENUM('SUPER_ADMIN', 'CORP_VIEWER', 'HOTEL_ADMIN', 'HOTEL_AUX', 'HOTEL_GUEST') NOT NULL DEFAULT 'HOTEL_GUEST';

-- CreateTable
CREATE TABLE `Hotel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Hotel_nombre_key`(`nombre`),
    UNIQUE INDEX `Hotel_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Area_nombre_departamentoId_hotelId_key` ON `Area`(`nombre`, `departamentoId`, `hotelId`);

-- CreateIndex
CREATE INDEX `AuditLog_hotelId_idx` ON `AuditLog`(`hotelId`);

-- CreateIndex
CREATE UNIQUE INDEX `Department_nombre_hotelId_key` ON `Department`(`nombre`, `hotelId`);

-- CreateIndex
CREATE INDEX `Device_hotelId_idx` ON `Device`(`hotelId`);

-- CreateIndex
CREATE UNIQUE INDEX `Device_numero_serie_hotelId_key` ON `Device`(`numero_serie`, `hotelId`);

-- CreateIndex
CREATE INDEX `Maintenance_hotelId_idx` ON `Maintenance`(`hotelId`);

-- CreateIndex
CREATE INDEX `User_hotelId_idx` ON `User`(`hotelId`);

-- CreateIndex
CREATE INDEX `UserSistema_hotelId_idx` ON `UserSistema`(`hotelId`);

-- AddForeignKey
ALTER TABLE `UserSistema` ADD CONSTRAINT `UserSistema_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Area` ADD CONSTRAINT `Area_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Maintenance` ADD CONSTRAINT `Maintenance_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
