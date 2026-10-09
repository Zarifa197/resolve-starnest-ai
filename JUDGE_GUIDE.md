# Resolve judge walkthrough

**Demo:** https://resolve-starnest-ai.vercel.app/demo

**No account, password, Shopify access, payment, or setup required.**

Open the link and scroll. The three examples are already populated:

1. **Browsed, then left:** optional product help, with explicit fictional permission for a browsing follow-up. Browsing does not prove dissatisfaction.
2. **Added to cart, then left:** a different message offers help with the item in the cart.
3. **Paid, then cancelled:** cancellation support respects the shopper’s decision and avoids inventing a reason.

Each example shows its timeline, recorded analysis, uncertainty, complete email subject and body, and test preview status. Expand **Inspect this scenario’s event and decision log** to read its normalized JSON. Download the full snapshot at `/submission-evidence.json`.

## What is real and what is simulated

- The shopper events are **synthetic examples**, with a compressed fictional clock. They are not captured Shopify storefront activity.
- The analysis label identifies whether a draft came from a recorded Gemini request or an authored example. Reading this page does not call Gemini.
- **Accepted** means Resend accepted a real preview email to the operator’s configured test inbox. It does not establish inbox delivery or automated delivery from an actual Shopify event.
- No judge email is requested, and viewing the page sends no message or payment.
- The page is a saved walkthrough, independent of the hosted database. It is not a live event stream.

## Optional deeper exploration

The original interactive AI sandbox is available at `/demo/ai`. It uses private synthetic sessions and needs configured hosted storage. Its analysis, approval, and simulated recovery controls are optional and are not required to understand the main demonstration.

## Copy and paste into the submission

> Demo: https://resolve-starnest-ai.vercel.app/demo
>
> No account or password is required. Open the link and scroll through three prepared shopping journeys: browsing without purchase, an abandoned cart, and a customer-requested order cancellation. Each shows the event timeline, explanation and uncertainty, complete proposed email, and restricted test preview status. Expand the event log to inspect the data.
>
> The shopping events are clearly labelled synthetic. Recorded Gemini drafts and Resend test-preview acceptance are labelled separately; provider acceptance is not confirmed inbox delivery. The walkthrough requires no judge interaction, sends no judge email, and does not claim that continuous Shopify tracking is already activated.
