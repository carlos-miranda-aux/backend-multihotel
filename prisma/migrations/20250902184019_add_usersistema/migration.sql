/*
  Warnings:

  - You are about to drop the column `rol` on the `usersistema` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `UserSistema` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `UserSistema` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserSistema` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `usersistema` DROP COLUMN `rol`,
    ADD COLUMN `email` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `UserSistema_email_key` ON `UserSistema`(`email`);
