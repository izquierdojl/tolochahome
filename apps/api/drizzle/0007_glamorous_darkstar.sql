CREATE TABLE `feed_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`intervalo_min` integer DEFAULT 30 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`url` text NOT NULL,
	`titulo` text NOT NULL,
	`sitio_url` text,
	`orden` integer NOT NULL,
	`actualizado_en` integer,
	`ultimo_intento_en` integer,
	`error` text,
	`etag` text,
	`last_modified` text,
	`entradas` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feeds_user_url_unique` ON `feeds` (`user_id`,`url`);