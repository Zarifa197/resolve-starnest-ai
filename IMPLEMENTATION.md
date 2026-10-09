> Historical implementation report. Earlier test counts and limitations below describe a previous state. See README.md, DEPLOYMENT.md and hackathon-evidence for the current audit.

# Resolve retention workflow — implementation report

Implemented and verified on October 9, 2026. The interface and documentation are in English.

## What was built

A persistent retention workspace with customer profiles, available context, event timelines, deterministic risk evidence, structured Gemini diagnosis, personalized responses, manual approval, safe execution, intervention history, audit records, and risk recalculation after new activity. Six labelled synthetic scenarios accompany the synchronized Shopify customers; unavailable Shopify context is not invented.

Northstar's judge scenario starts at 90/100: unresolved CRM authentication failures (35), repeated failures (10), a 70% usage decline (30), and open support (15). The live AI proposes troubleshooting with cited evidence and states what remains unknown. Approving the response records simulated execution without sending email. Three explicitly synthetic recovery events reduce the score to 0. Execution alone leaves the score unchanged.

Manual approval is the default. Explicit automatic execution is restricted to the demo workspace and runs when analysis is requested. Opt-outs, unknown communication permission, contact limits, stale evidence, and duplicate execution are enforced on the server. No-action decisions carry no email. Missing or invalid AI responses use a visible deterministic fallback.

## Preserved

Resolve branding and landing page, Shopify customer synchronization, webhook verification and ingestion, previous customer event records and drafts, existing integrations, Gemini configuration, Resend's restricted test sender, and local D1 infrastructure. Existing views remain accessible from the sidebar. Unconditional webhook email sending was removed to enforce the requested manual default.

## Files

New:

- `lib/retention-core.ts` — event/AI validation, explainable risk, communication and execution checks.
- `lib/retention-seed.ts` — isolated, clearly synthetic scenarios.
- `lib/retention-store.ts` — SQL persistence, Shopify projection, lifecycle, reservation, audit and reset.
- `lib/retention-ai.ts` — live Gemini integration; identifiers are aliased and customer email/raw provider payloads are excluded.
- `app/api/retention/route.ts` — validated workspace API.
- `components/resolve/retention.tsx` and `components/resolve/retention.css` — responsive retention experience.
- `drizzle/0003_retention_workflow.sql` — additive tables and indexes.
- `scripts/migrate-retention-local.mjs` — local migration helper.
- `tests/retention.test.mjs` — lifecycle, risk, AI and delivery guard tests.
- `HACKATHON.md` and `IMPLEMENTATION.md` — operation, demo, evidence and limitations.

Updated:

- `app/dashboard/page.tsx` — default retention workspace and mobile navigation dismissal.
- `lib/provider-events.ts` — manual approval default and profile invalidation on new webhook evidence.
- `db/schema.ts` — retention tables.
- `package.json` — verification and local migration commands.
- `tsconfig.json` — support TypeScript imports in the Node test runner.

## Verification actually executed

- `npm test`: **28/28 test entries passed**: 26 retention tests plus the two existing test files, which report five decision checks and seven webhook checks. Repository SQL runs against isolated SQLite; AI and email providers are mocked in these tests.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vinext completed its production build; its current route classifier reports root/dashboard as unknown, not a build error.
- Browser: exercised the actual local D1 API and **live Gemini**, operator approval, simulated execution, recovery ingestion, score 90 → 0, and reload persistence.
- Browser: checked Shopify/synthetic source filters, existing customer directory, and mobile sidebar navigation.
- Responsive inspection: 1440 × 1000 and 390 × 844. Mobile retention layout had no horizontal overflow. Temporary viewport override restored afterward.
- Final browser console: no captured warnings or errors.

No external email was sent during this verification. Restricted email acceptance and timeout handling were tested with injected providers; live inbox delivery was not tested or claimed.

## Run the judge demo

The current local preview is running at **http://127.0.0.1:5173/dashboard**. To start it later, run `npm run dev` from this directory. The retention migration is already applied to the current local D1 database.

1. Open the dashboard and choose **Open judge demo**.
2. Choose **Reset demo** to restore Northstar's five synthetic events, score 90, and manual/simulator defaults. Shopify records are preserved.
3. Choose **Analyze with AI**. Inspect the possible cause, unknowns, cited events and personalized response. A provider failure is explicitly labelled as fallback.
4. Choose **Approve & simulate delivery**. Review intervention history and audit trail; risk remains 90 and no email leaves Resolve.
5. Choose **Simulate re-engagement**. Inspect three new synthetic events and the labelled 90 → 0 comparison.
6. Reload, reopen the judge demo, and confirm persistence.

## Incomplete / configuration requirements

Production authentication and tenant isolation, verified sender-domain delivery, delivery receipts, inbound replies, complete Shopify order/subscription/activity history, a background retention scheduler, and a durable outbound retry worker remain incomplete. This is a local single-workspace demonstration. Explicit demo automation runs on analysis, not continuously in the background. The temporary Shopify webhook tunnel depends on this computer remaining online.

Restricted test email requires server-side `RESEND_API_KEY` and `EMAIL_TEST_TO` and always uses the fixed configured recipient. A provider ID means accepted, not delivered; uncertain outcomes suppress retry. Real customer outreach remains disabled. Production configuration and authorization must be completed before enabling it.

Risk is a documented attention heuristic, not churn probability. Synthetic improvement does not establish actual retention or show that outreach caused recovery. See `HACKATHON.md` for weights and full operating notes.
