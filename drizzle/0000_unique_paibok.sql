CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario` text NOT NULL,
	`decision` text NOT NULL,
	`status` text DEFAULT 'awaiting' NOT NULL,
	`ticket` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
