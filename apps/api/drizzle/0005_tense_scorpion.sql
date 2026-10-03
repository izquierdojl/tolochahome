CREATE TABLE `search_engines` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nombre` text NOT NULL,
	`url_template` text NOT NULL,
	`alias` text NOT NULL,
	`sugerencias_url` text,
	`orden` integer NOT NULL,
	`por_defecto` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
