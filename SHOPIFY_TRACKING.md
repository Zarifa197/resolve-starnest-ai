# Connect Shopify behavior to Resolve

Resolve distinguishes **anonymous storefront activity** from **identified customer/order history**. Product browsing alone never creates an email job. Do not infer a person’s identity from a browser ID.

## What works without Shopify

Open `/demo`. Expand **Explore the fictional data** to read seven examples, their expected response, profiles, and raw event JSON. Download `/demo-data.json` for a reproducible snapshot. This preview requires neither a database nor an AI key and does not save or send anything.

The interactive **Start judge demo** workflow uses separate, temporary database workspaces. It requires configured storage. **Analyze with AI** distinguishes real Gemini results from labelled fallback rules. Approval, delivery, and re-engagement are simulated.

## Merchant prerequisites

1. Connect an authorized development store through Shopify OAuth. Customer/order synchronization requires `read_customers,read_orders`. The Web Pixel requires `write_pixels,read_customer_events` and the appropriate merchant permissions.
2. Set `PUBLIC_APP_URL` to the deployed Resolve HTTPS origin. Configure persistent D1 storage and migrations `0000` through `0006`. Keep server credentials private.
3. In **Agent operations**, synchronize Shopify and inspect source health. A failed permission request is not a successful empty sync.
4. In **Shopify behavior tracking**, click **Prepare collector settings**. Copy the returned `endpointUrl` and `shopDomain` into the Shopify pixel registration settings. This only prepares the collector; it does not activate tracking.

## Developer: deploy and register the extension

Link the Shopify application configuration to your own app; `shopify.app.example.toml` is a template, not a provisioned app. Deploy the `extensions/resolve-pixel` extension using the authenticated Shopify CLI. Obtain the required scopes through Shopify’s app installation/update flow.

Use the authenticated Admin GraphQL API for that store to register the deployed extension:

```graphql
mutation CreateResolvePixel($webPixel: WebPixelInput!) {
  webPixelCreate(webPixel: $webPixel) {
    userErrors { field message code }
    webPixel { id settings }
  }
}
```

Variables use the exact settings prepared in the dashboard:

```json
{
  "webPixel": {
    "settings": {
      "endpointUrl": "COPY THE PREPARED RESOLVE HTTPS COLLECTOR URL",
      "shopDomain": "YOUR-STORE.myshopify.com"
    }
  }
}
```

Resolve does not currently perform or verify this registration automatically. Inspect `userErrors`, confirm the pixel in Shopify, and test actual receipts. Consult [Shopify’s webPixelCreate documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/webPixelCreate) and [standard events](https://shopify.dev/docs/api/web-pixels-api/standard-events) for current requirements.

## Verify the store before claiming live tracking

1. Use the development storefront with the required analytics and marketing consent.
2. View a product, add it to the cart, and start checkout.
3. Refresh the dashboard’s tracking status. Confirm receipt time and event counts.
4. Inspect the corresponding `shopping_events` records. Public pixel receipts remain anonymous and self-reported; a stored receipt does not prove Shopify authentication or customer identity.
5. Test a completed order and cancellation separately using the test payment gateway. Signed commerce webhooks and authorized Admin API synchronization attach records using trusted Shopify customer identifiers.
6. Verify identified commerce timelines, communication eligibility, drafts, execution history, and delivery receipts separately. The committed Vercel scheduler runs daily; rapid unattended recovery needs an independently tested scheduling setup.

Public collection rejects identity fields, missing required consent, stale timestamps, disabled collectors, and exceeded event budgets. It deduplicates events and hashes browser identifiers per merchant. A routing key is public configuration, not proof that a request came from Shopify.

## Current verification limits

The collector and fictional scenarios have automated tests. Live Web Pixel deployment/registration and real storefront receipts have **not** been verified. A hosted storage failure also prevents persistent judge sessions and merchant workflows. Preparing settings or viewing mock data must not be described as completing those integrations.
