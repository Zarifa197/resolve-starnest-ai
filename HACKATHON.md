> Historical implementation report. Earlier test counts and limitations below describe a previous state. See README.md, DEPLOYMENT.md and hackathon-evidence for the current audit.

# Resolve: live judge demonstration

Resolve connects an observed customer problem to an appropriate intervention. The working vertical slice is **evidence → explainable risk → structured AI diagnosis → operator approval → safe execution → audit trail → simulated new activity → recalculated risk**.

## Run locally

Use Node 22.18+ (the current environment uses Node 25). In this directory:

```sh
npm run dev
```

The existing preview runs at `http://127.0.0.1:5173`. The additive retention migration has been applied to the current local database. On another checkout with the existing base tables initialized, run `npm run db:retention:local`. For hosted D1, apply `drizzle/0003_retention_workflow.sql` to the correct database through the deployment migration process; the local migration script never modifies a hosted database.

Existing `.dev.vars` credentials are server-only. `GEMINI_API_KEY` enables genuine AI diagnosis; `RESEND_API_KEY` and `EMAIL_TEST_TO` enable restricted test email. Missing or invalid AI output produces an explicitly labelled deterministic fallback. Never put credentials in the browser.

## Judge walkthrough (about 3 minutes)

1. Open `/dashboard`. Choose **Start judge demo** (or **Open judge demo**). If a previous run exists, choose **Reset demo**. Reset affects only the synthetic workspace.
2. Open Northstar. Its score is **90/100**: unresolved integration failure +35, three repeated failures +10, 70% usage decline +30, open support issue +15. Read its five event records and customer context. All are explicitly synthetic.
3. Choose **Analyze with AI**. Resolve passes evidence and communication policy to Gemini, validates structured output, shows a possible cause, unknowns, cited event evidence, and a personalized troubleshooting email. A visible fallback label means the live provider was unavailable or its output failed validation.
4. Leave **Execution controls** on manual approval and in-app simulation. Choose **Approve & simulate delivery**. The intervention and approval are saved; no external email is sent. Risk remains 90 because execution alone is not new evidence.
5. Choose **Simulate re-engagement**. Three new synthetic events restore the integration, resolve support, and recover usage. Risk recalculates from 90 to 0. The before/after panel states that this is simulated and does not demonstrate real retention or causation.
6. Reload and reopen Northstar: events, diagnosis, action, and audit history persist in local D1. **Reset demo** restores the starting scenario and manual approval defaults.

## Other interactive scenarios

- Bluepeak: stalled onboarding → focused setup help.
- Meridian: no unresolved risk signal → no action.
- HarborCloud: opted out → internal review, no customer email.
- LumaStack: seeded recent simulated outreach → cooldown, no repeat message.
- PineWorks: failed payment → billing assistance, no invented affordability diagnosis.

Use the source filters/search to explore these scenarios or Shopify profiles. Shopify profiles project actual synchronized customers and cancellation events. Subscription, onboarding, full purchase history, usage, support, and communication consent remain **unavailable** unless provided; Resolve does not synthesize these fields for provider customers. Unknown permission blocks outreach.

## Execution controls

Manual approval is the default, including newly ingested Shopify webhook drafts. Explicit automatic execution is available only in the synthetic demo workspace and acts **when analysis runs**. It does not create a background schedule. Opt-outs/unknown permission, a 72-hour contact limit (configurable 24–168 hours), stale evidence/policy, and duplicate decision execution are checked on the server.

The simulator records `simulated`. Optional restricted email always routes through the existing sender `onboarding@resend.dev` to the server-configured `EMAIL_TEST_TO`, never the customer email. A provider ID records **accepted**, not delivered. A timeout/error records **unknown** and suppresses automatic retry. An interrupted request can remain **executing**, requiring operator investigation; no retry worker currently exists.

## Risk and AI

Risk is an attention heuristic, not a churn probability or trained model. Weights: unresolved integration failure 35; 3+ failures 10; usage decline >=50% 30 (25–49% 15); open support 15; stalled onboarding 20; payment failure 25; order cancellation 10. Total capped at 100. Later recovery events resolve older matching signals. No activity means Unknown, not proven healthy. Signals currently persist until explicit recovery; no time-decay model is claimed.

Gemini analyzes facts and selects among troubleshooting, onboarding help, billing help, clarification, internal review, or no action. Evidence IDs must exist; actions must match available unresolved signals and policy. No-action decisions cannot carry an email. Customer emails, raw Shopify payloads and identifiers are not included in the model request. The AI can still make imperfect semantic judgments: operators should inspect its explanation and draft.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

The retention tests use the real repository SQL on isolated SQLite and mocked AI/email providers. They cover the complete persisted lifecycle, evidence selection, conflicting/recovered signals, missing data, opt-outs, no action, fallback, stale drafts, manual approval, duplicate/concurrent execution, contact limits, test acceptance, uncertain provider outcomes, scoped Shopify history, ingestion/recalculation, and demo reset preserving Shopify data. Existing webhook signature and rule-selection tests remain in the suite. Live browser validation additionally exercises the actual local D1 API and the configured Gemini provider.

## Current limits

This is a local single-workspace hackathon application, not a production multitenant deployment. It has no production authorization, verified sender-domain delivery, delivery webhooks, inbound reply ingestion, complete Shopify order history, background retention scheduler, durable outbound retry worker, or causal retention measurement. The existing temporary webhook tunnel depends on this computer remaining online. Deploy/authenticate the service, complete approved real data ingestion and delivery configuration, and secure the operator interface before production customer outreach.
