CREATE TABLE `settings_change_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`field` varchar(100) NOT NULL,
	`old_value` text NOT NULL,
	`new_value` text NOT NULL,
	`changed_by` varchar(255) NOT NULL,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `settings_change_history_id` PRIMARY KEY(`id`)
);
