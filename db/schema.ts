import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const cases = sqliteTable('cases',{
 id:text('id').primaryKey(),scenario:text('scenario').notNull(),decision:text('decision').notNull(),status:text('status').notNull().default('awaiting'),ticket:text('ticket'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),version:integer('version').notNull().default(1)
});
export const imports = sqliteTable('imports',{
 id:text('id').primaryKey(),filename:text('filename').notNull(),source:text('source').notNull(),rowCount:integer('row_count').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull()
});
export const recoveryRecords = sqliteTable('recovery_records',{
 id:text('id').primaryKey(),customerId:text('customer_id').notNull(),name:text('name').notNull(),signal:text('signal').notNull(),context:text('context').notNull(),status:text('status').notNull(),decision:text('decision').notNull(),source:text('source').notNull(),importId:text('import_id').notNull(),ticket:text('ticket'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),version:integer('version').notNull().default(1)
});
export const providerEvents = sqliteTable('provider_events',{
 id:text('id').primaryKey(),provider:text('provider').notNull(),eventType:text('event_type').notNull(),customerId:text('customer_id').notNull(),mode:text('mode').notNull(),createdAt:text('created_at').notNull()
});
export const companies=sqliteTable('companies',{id:text('id').primaryKey(),shopDomain:text('shop_domain').notNull().unique(),syncedAt:text('synced_at')});
export const customers=sqliteTable('customers',{id:text('id').primaryKey(),companyId:text('company_id').notNull().references(()=>companies.id),shopifyId:text('shopify_id').notNull(),email:text('email'),syncedAt:text('synced_at').notNull()});

// Retention lifecycle: additive tables, separate synthetic workspace and provider records.
export const retentionAccounts=sqliteTable('retention_accounts',{id:text('id').primaryKey(),workspace:text('workspace').notNull(),name:text('name').notNull(),email:text('email'),source:text('source').notNull(),profile:text('profile').notNull(),version:integer('version').notNull().default(1)});
export const retentionEvents=sqliteTable('retention_events',{id:text('id').primaryKey(),accountId:text('account_id').notNull().references(()=>retentionAccounts.id),body:text('body').notNull()});
export const retentionDecisions=sqliteTable('retention_decisions',{id:text('id').primaryKey(),accountId:text('account_id').notNull().references(()=>retentionAccounts.id),fingerprint:text('fingerprint').notNull(),createdAt:text('created_at').notNull(),diagnosis:text('diagnosis').notNull()});
export const retentionActions=sqliteTable('retention_actions',{id:text('id').primaryKey(),accountId:text('account_id').notNull().references(()=>retentionAccounts.id),decisionId:text('decision_id').notNull().unique(),body:text('body').notNull()});
export const retentionAudit=sqliteTable('retention_audit',{id:text('id').primaryKey(),accountId:text('account_id').notNull().references(()=>retentionAccounts.id),kind:text('kind').notNull(),detail:text('detail').notNull(),at:text('at').notNull()});
export const retentionSettings=sqliteTable('retention_settings',{workspace:text('workspace').primaryKey(),body:text('body').notNull()});
