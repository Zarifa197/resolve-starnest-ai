CREATE TABLE `imports` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`source` text NOT NULL,
	`row_count` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`customer_id` text NOT NULL,
	`mode` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recovery_records` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`name` text NOT NULL,
	`signal` text NOT NULL,
	`context` text NOT NULL,
	`status` text NOT NULL,
	`decision` text NOT NULL,
	`source` text NOT NULL,
	`import_id` text NOT NULL,
	`ticket` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
