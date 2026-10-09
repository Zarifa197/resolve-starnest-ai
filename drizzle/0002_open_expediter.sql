CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_domain` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_shop_domain_unique` ON `companies` (`shop_domain`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`shopify_id` text NOT NULL,
	`email` text,
	`synced_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
