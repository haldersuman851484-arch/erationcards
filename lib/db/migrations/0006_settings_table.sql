-- Admin-editable runtime settings (key-value store).
-- First consumer: merchant_upi_id — the UPI ID shown to customers on the
-- payment step. When no row exists, the API falls back to the
-- MERCHANT_UPI_ID environment variable.
CREATE TABLE `settings` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
