-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
