# Resolve — judge access and walkthrough

**URL:** https://resolve-starnest-ai.vercel.app/demo

**Account:** not required. **Password:** not required. A temporary demo session is created by the application. Do not use a Shopify merchant account to review the synthetic demonstration.

> Availability checked October 9, 2026 at 19:32 Baku: the page loads, but Start judge demo fails with “Storage is temporarily unavailable.” The walkthrough below is the intended flow and has been verified locally; it must be retested on the hosted deployment after database configuration is repaired. See [the submission audit](SUBMISSION_AUDIT.md).

## A two-minute walkthrough

1. Click **Start judge demo**. This creates a private workspace containing synthetic profiles. Other judges receive separate sessions.
2. Inspect Ava’s timeline: product viewed → added to cart → checkout started → incomplete checkout. An unresolved checkout signal contributes to a priority score of 45; this is not a 45% churn probability.
3. Click **Analyze with AI**. Inspect the proposed action, possible cause, uncertainty, cited events, subject, and message. A Gemini engine label indicates an actual model response. A fallback label indicates deterministic rules.
4. Click **Approve & simulate delivery**. This records a simulated intervention. **No email is sent and no payment is taken.**
5. Click **Simulate re-engagement**. A synthetic completion event is added and the unresolved-risk score changes to 0. This demonstrates event processing, not a measured commercial recovery.
6. Reload the page. The recorded timeline should remain within the demo session. Use **Reset demo** to repeat the walkthrough.

Use **All customers** to compare seven fictional cases: Ava (incomplete checkout), Leo (browsing only), Maya (purchase completed), Oliver (cancellation), Noah (opt-out), Emma (recent outreach), and Northstar (SaaS integration trouble). The expected response is explained for each case.

**Without a database:** expand **Explore the fictional data** to inspect readable timelines and raw profile/event JSON. Download the complete fictional dataset from the demo page. This read-only preview does not call AI, save actions, or send email. Full English instructions are available at `/guide`.

## What to look for

- Recommendations distinguish observed events from possible causes and unknowns.
- Evidence references point to events in the timeline.
- Inappropriate outreach can become `internal_review` or `no_action`.
- Approval, execution, and outcome records are distinct.
- The interface identifies synthetic data and simulated delivery.

## Session behavior

Sessions expire after one hour. Use the same browser to retain your session, or a separate private browser context to start independently. Session-scoped access controls and cross-origin protections were verified locally; hosted isolation requires a retest once storage works. Analysis and reset operations have server-side demo budgets.

If you see a storage error, the application could not access its persistent database. That is a deployment issue, not a missing judge password. A Gemini failure or fallback is also separate from login.

## For the submission form

- **Demo URL:** https://resolve-starnest-ai.vercel.app/demo
- **Login:** Not required — isolated synthetic guest session.
- **Instructions:** Start judge demo → Analyze with AI → Approve & simulate delivery → Simulate re-engagement → reload to inspect history.
- **Disclosure:** Delivery and customer re-engagement are simulated. Actual Shopify and Gemini API checks were performed through the local application. At the dated public audit, the hosted workflow remains blocked by storage.

Do not submit the demo as fully working until the Start, Analyze, Simulate, and Reload steps pass on the public URL.
