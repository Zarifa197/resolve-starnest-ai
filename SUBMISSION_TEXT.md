# Copy-paste submission instructions

Demo: https://resolve-starnest-ai.vercel.app/demo
Username / password: Not required.

Open the link and scroll. Everything is already populated; no setup or button clicks are needed. Compare three shopping journeys: browsing without purchase, an abandoned cart, and a customer-requested cancellation. Each includes its event timeline, a recorded Gemini recommendation and uncertainty, the full email subject and body, and a test-preview status. Expand any scenario log to inspect its source data, or download the complete evidence JSON.

The shopping behavior is clearly labelled synthetic. Gemini generated the three recorded drafts from those fictional events, and Resend accepted restricted test previews for the operator’s configured inbox. Inbox delivery has not been independently verified. These previews were not triggered by real Shopify behavior; live continuous tracking, automatic customer delivery, and retention uplift are not claimed.

Resolve’s intended workflow connects Shopify behavior to an identified customer, interprets the evidence with Gemini, checks communication permissions, and sends and records an appropriate response. Actual development-store synchronization and local Gemini calls are documented separately. The optional interactive AI sandbox at `/demo/ai` requires hosted storage and is not needed to review the prepared walkthrough.

Repository: https://github.com/Zarifa197/resolve-starnest-ai
English guide: https://resolve-starnest-ai.vercel.app/guide
