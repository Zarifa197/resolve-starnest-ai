# Copy-paste submission instructions

## Demo access

Demo URL: https://resolve-starnest-ai.vercel.app/demo
Username: Not required
Password: Not required
Access: Click “Start judge demo” to create an isolated guest workspace with synthetic customer profiles.

## Judge walkthrough

1. Click “Start judge demo” and open the checkout customer.
2. Inspect the customer’s event timeline and risk evidence.
3. Click “Analyze with AI” to review the recommended action, possible cause, uncertainty, cited events, and message draft. The engine label identifies actual Gemini analysis or the deterministic fallback.
4. Click “Approve & simulate delivery.” No real email is sent.
5. Click “Simulate re-engagement” to add a synthetic recovery event and inspect the revised risk score.
6. Reload the page to check that the session’s history persists. Use “Reset demo” to start again.

## Disclosure and current availability

The judge workspace uses synthetic data. Delivery and customer re-engagement are simulated; they do not represent measured revenue recovery. Actual Shopify development-store synchronization and Gemini calls have been verified through the local application.

At the October 9, 2026 public audit, the deployed page loads but the judge workflow is blocked by “Storage is temporarily unavailable.” It is not yet a functioning hosted end-to-end demo. This notice must remain until database access is repaired and the public walkthrough is retested.

## Project summary

Resolve is an AI-assisted retention workspace that connects customer events to an inspectable recommendation. It combines a transparent risk heuristic with structured Gemini analysis, evidence references, uncertainty, communication-policy checks, and a recorded intervention history. Shopify is the first connected commerce platform. The broader SaaS scenarios are synthetic examples.

Repository: https://github.com/Zarifa197/resolve-starnest-ai
Website: https://resolve-starnest-ai.vercel.app/
README, judge guide, and dated audit evidence are included in the repository.
