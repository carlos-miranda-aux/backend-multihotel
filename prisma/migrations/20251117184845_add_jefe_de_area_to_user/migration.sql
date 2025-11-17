-- AlterTable
ALTER TABLE `device` ADD COLUMN `fecha_proxima_revision` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `es_jefe_de_area` BOOLEAN NOT NULL DEFAULT false;
