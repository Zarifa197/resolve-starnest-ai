declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    GEMINI_API_KEY?: string;
    RESEND_API_KEY?: string;
    EMAIL_TEST_TO?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SHOPIFY_CLIENT_SECRET?: string;
    SHOPIFY_CLIENT_ID?: string;
    SHOPIFY_SHOP_DOMAIN?: string;
    CRON_SECRET?: string;
    SESSION_SECRET?: string;
    PUBLIC_APP_URL?: string;
    RESEND_WEBHOOK_SECRET?: string;
    BUCKET?: R2Bucket;
  }
}

declare module '@resolve/runtime' {export const env: Cloudflare.Env;}
