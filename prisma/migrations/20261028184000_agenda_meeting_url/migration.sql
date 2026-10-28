-- Additive MariaDB migration. Back up production DB first; no existing event is modified.
ALTER TABLE `AgendaEvent` ADD COLUMN `meetingUrl` VARCHAR(500) NULL;
