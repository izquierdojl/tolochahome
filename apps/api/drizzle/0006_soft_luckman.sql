CREATE TABLE `weather_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nombre` text NOT NULL,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`orden` integer NOT NULL,
	`por_defecto` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
