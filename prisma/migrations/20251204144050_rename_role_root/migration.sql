/*
  Warnings:

  - The values [SUPER_ADMIN] on the enum `UserSistema_rol` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `usersistema` MODIFY `rol` ENUM('ROOT', 'CORP_VIEWER', 'HOTEL_ADMIN', 'HOTEL_AUX', 'HOTEL_GUEST') NOT NULL DEFAULT 'HOTEL_GUEST';
