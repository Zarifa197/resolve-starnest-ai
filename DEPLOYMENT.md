# Vercel deployment

## Status

The Next.js production build passes locally. No live deployment or successful remote database connection is claimed. Vercel browser access is blocked by a saved site permission until the founder changes it. GitHub publication can proceed independently.

## Prerequisites and database

Use the founder's GitHub repository, Vercel account and a dedicated managed Cloudflare D1 database. Vercel accesses D1 through the server-only HTTP adapter. Never store production data in serverless temporary files or upload the development database to the public demo.

Create an **empty** D1 database in Cloudflare. Apply the six files in numeric order: `drizzle/0000_unique_paibok.sql`, `0001_confused_captain_cross.sql`, `0002_open_expediter.sql`, `0003_retention_workflow.sql`, `0004_shopify_agent.sql`, `0005_judge_sessions.sql`. Use the SQL console or authenticated Wrangler: `npx wrangler d1 execute resolve-production --remote --file drizzle/0000_unique_paibok.sql`, replacing the database name and repeating with each file. Record migrations; the first three must not be rerun. Do not overwrite an existing database.

Create a least-privilege account-scoped D1 token, with the founder's approval. Never use a global API key. The HTTP adapter is mock-tested; managed D1 connectivity must be verified after configuration.

## Environment variables — names only

For the public demo, set these server-side values in Vercel Production:

| Name | Purpose |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Account hosting D1 |
| `D1_DATABASE_ID` | Managed database UUID |
| `CLOUDFLARE_D1_TOKEN` | Account-scoped D1 credential |
| `GEMINI_API_KEY` | Runtime analysis; explicit fallback without it |

Merchant workflows additionally need `APP_URL`, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SHOP_DOMAIN`, `CRON_SECRET`. Generate authentication/encryption values in the formats required by `lib/merchant-auth.ts`; do not reuse provider keys. `APP_URL` must be the stable deployed HTTPS origin.

Restricted email needs `RESEND_API_KEY` and `EMAIL_TEST_TO`. Production sending additionally requires the verified sender and merchant legal/consent settings, including `EMAIL_FROM` and `EMAIL_SENDER_VERIFIED`. Delivery receipts require `RESEND_WEBHOOK_SECRET`. Read the current environment declarations before setting optional values. None of these may use `NEXT_PUBLIC_`.

## Vercel import

Import `Zarifa197/resolve-starnest-ai`, branch `main`, root `./`, preset **Next.js**. Use Node 22.18 or newer. Committed `vercel.json` provides:

- Install: `npm ci`
- Build: `npm run build:vercel`
- Development: `npm run dev:vercel`
- Daily cron: `/api/cron`, `0 0 * * *`

The build sets `RESOLVE_RUNTIME=vercel`, selects the Node/D1 adapter and emits `.next-vercel`. Do not override the output directory with the Cloudflare `dist` directory. Keep private merchant authentication; `/demo` already has a separate public API.

If Vercel requests broader GitHub access, limit it to this repository and have the founder approve the change. Paid upgrades need a separate budget approval.

## Shopify and providers

After public smoke tests, set Shopify's app URL to the actual HTTPS origin and OAuth redirect to `/auth/shopify/callback`. Retain `read_customers,read_orders`, release the configuration and approve updated scopes in the development shop. Use `/api/webhooks/shopify` for signed commerce events and `/api/webhooks/resend` for delivery receipts with their configured secrets.

Do not leave the laptop tunnel as a production callback. Pixel installation is a separate unfinished integration; implementation files are not evidence of live browsing capture.

## Required post-deployment verification

1. Open `/demo` in a fresh private browser session. It must expose no merchant profiles.
2. Start, analyze, approve simulation, simulate completion and reload. Confirm history persists.
3. Confirm a second session is isolated and resetting it does not change the first session or merchants.
4. Anonymous merchant APIs must return 401; cross-origin demo writes must return 403. Public simulation must send no Resend request.
5. Check function logs and remote DB access. Build success alone does not pass these checks.
6. Test Gemini on synthetic contexts. Test Resend only through the authorized fixed test recipient; distinguish acceptance from delivery.
7. Verify a scheduled job while the dashboard is closed. Hobby daily cron does not provide prompt recovery; a suitably authorized scheduler is needed for a pilot.

## Rollback and limits

Record the verified SHA and Vercel deployment identity. Restore a prior verified deployment if needed; do not delete database tables. Disable automatic sending before changing configuration. Unknown outbound results need reconciliation rather than replay. Expired demo sessions need an administrative cleanup policy.

Real-customer sending remains blocked pending production OAuth, sender verification, consent/legal configuration and live delivery/background verification.

References: [D1 query API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), [D1 REST operational limits](https://developers.cloudflare.com/d1/tutorials/build-an-api-to-access-d1/), [Vercel cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
