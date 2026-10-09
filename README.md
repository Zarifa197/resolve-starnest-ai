# Resolve

An evidence-based Shopify retention workspace with structured Gemini analysis, guarded interventions and an isolated public demonstration.

## Current verification — October 9, 2026

- The authorized Shopify development shop synchronized four customers and one order. Its abandoned-checkout query succeeded but returned zero records: live checkout recovery is not yet proved.
- Six privacy-safe synthetic contexts reached the real `gemini-3.5-flash-lite` API. All six action categories matched the predefined rubric. The existing contextual rule baseline also matched all six; no commercial retention improvement is established.
- The local `/demo` browser workflow used real Gemini, persisted approval, simulated execution and a clearly synthetic checkout completion. Risk changed from 45 to 0 and records survived reload. No real purchase or email occurred in that demonstration.
- Automated tests use actual repository SQL and controlled provider mocks. Exact results and preserved failures are in `hackathon-evidence/logs/`.
- `npm run build:vercel` passes. Live Vercel deployment and managed database access remain unverified until configured.

## Judge demonstration

Open `/demo`, choose **Start judge demo**, **Analyze with AI**, **Approve & simulate delivery**, then **Simulate re-engagement**. Each visitor gets a separate synthetic workspace. No merchant sign-in is required. Gemini requires a server-side key; otherwise the interface explicitly labels the deterministic fallback.

The public demo never calls an email provider. Session creation, analyses and resets have server-side budgets. These are basic demonstration limits, not comprehensive denial-of-service protection.

## Architecture

React 19 / Next.js 16 UI, Vinext/Vite for local Cloudflare execution, D1-compatible SQL, Shopify Admin GraphQL and signed webhooks, Gemini REST with Zod validation, and Resend test-email integration. Merchant APIs require authentication outside local development. Production customer sending is gated by verified sender configuration, consent and explicit merchant policy.

The risk score is a transparent priority heuristic, not a churn probability. Provider acceptance does not establish inbox delivery; a later purchase does not establish that Resolve caused it.

## Local development

Use Node 22.18 or newer (this workspace uses Node 25.2.1).

```sh
npm ci
npm run build
```

Initialize the local D1 database with migrations 0000 through 0005 in numeric order, using Wrangler and the generated `dist/server/wrangler.json`. Existing databases with the first three migrations can run `npm run db:retention:local`. Then run `npm run dev` and open the printed address.

```sh
npm test
npm run typecheck
npm run build:vercel
```

Local secrets belong in ignored `.dev.vars`. Never commit API keys, database files or access tokens. See [DEPLOYMENT.md](DEPLOYMENT.md) for durable storage and Vercel requirements.

## Limits

Vercel requires a managed database. Local `.wrangler` SQLite is not durable production storage. The D1 HTTP adapter is mock-tested, not yet verified against this project's managed database. Its administrative API limits constrain scale.

The Shopify pixel extension is not registered or verified live. Resend receipts, production OAuth and hosted background execution are implemented but remain unverified live. Hobby daily cron is too infrequent for prompt recovery. Draft editing, inbound replies and complete privacy-erasure workflows remain incomplete. Real-customer email sending remains disabled.

Earlier HACKATHON.md and IMPLEMENTATION.md preserve historical verification states; use this README and newly generated evidence for the current audit. See [PROVENANCE.md](PROVENANCE.md) before declaring hackathon eligibility.
