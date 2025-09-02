-- AlterTable
ALTER TABLE `usersistema` ADD COLUMN `nombre` VARCHAR(191) NULL,
    ADD COLUMN `rol` ENUM('ADMIN', 'USER', 'EDITOR') NOT NULL DEFAULT 'USER';

-- RenameIndex
ALTER TABLE `usersistema` RENAME INDEX `UserSistema_email_key` TO `userSistema_email_key`;

-- RenameIndex
ALTER TABLE `usersistema` RENAME INDEX `UserSistema_username_key` TO `userSistema_username_key`;
