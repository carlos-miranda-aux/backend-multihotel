/*
  Warnings:

  - You are about to drop the column `hotelId` on the `usersistema` table. All the data in the column will be lost.
  - Made the column `ip_equipo` on table `device` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fecha_programada` on table `maintenance` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `usersistema` DROP FOREIGN KEY `UserSistema_hotelId_fkey`;

-- DropIndex
DROP INDEX `UserSistema_hotelId_idx` ON `usersistema`;

-- AlterTable
ALTER TABLE `device` MODIFY `ip_equipo` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `maintenance` MODIFY `fecha_programada` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `usersistema` DROP COLUMN `hotelId`;

-- CreateTable
CREATE TABLE `_HotelToUserSistema` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_HotelToUserSistema_AB_unique`(`A`, `B`),
    INDEX `_HotelToUserSistema_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_HotelToUserSistema` ADD CONSTRAINT `_HotelToUserSistema_A_fkey` FOREIGN KEY (`A`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HotelToUserSistema` ADD CONSTRAINT `_HotelToUserSistema_B_fkey` FOREIGN KEY (`B`) REFERENCES `UserSistema`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
