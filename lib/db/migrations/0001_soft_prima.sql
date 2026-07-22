CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`customer_name` text NOT NULL,
	`district` text NOT NULL,
	`card_type` text NOT NULL,
	`rating` int NOT NULL,
	`quote` text NOT NULL,
	`photo_url` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
