# Edulience Premium - Paddle Billing setup

Edulience supports both Paddle Sandbox and Paddle Live. Every deployment must use credentials, catalog IDs, webhook secrets, and frontend tokens from the same Paddle environment.

## 1. Create the catalog

1. Open the Paddle environment for the deployment: Sandbox for development or Live for production.
2. Create a product named `Edulience Premium`.
3. Create one recurring Premium price.
4. Store that environment's price ID as `PADDLE_PREMIUM_PRICE_ID`.

The application never creates products or prices automatically. Sandbox and Live catalog IDs are separate.

## 2. Create credentials

1. Create an API key with customer, transaction, subscription, and customer-portal permissions. Store it on Render as `PADDLE_API_KEY`.
2. Create a client-side token. Store it in the Vite build environment as `VITE_PADDLE_CLIENT_TOKEN`.

For Sandbox, the server API key must start with `pdl_sdbx_apikey_` and the browser token must start with `test_`. For production, the server API key must start with `pdl_live_apikey_` and the browser token must start with `live_`. Never place the API key or webhook secret in a `VITE_*` variable.

## 3. Configure the Default payment link

Paddle Checkout requires a Default payment link. Configure it in Paddle Checkout settings for the selected environment. Application code does not configure this setting.

## 4. Configure the webhook destination

Create a notification destination in the selected Paddle environment:

```text
https://z-project-ba3t.onrender.com/api/billing/paddle-webhook
```

Select:

- `transaction.completed`
- `subscription.created`
- `subscription.activated`
- `subscription.trialing`
- `subscription.updated`
- `subscription.past_due`
- `subscription.paused`
- `subscription.resumed`
- `subscription.canceled`

Copy that destination's secret into `PADDLE_WEBHOOK_SECRET`. It normally starts with `pdl_ntfset_`. Sandbox and Live webhook destinations have separate secrets.

## 5. Server environment

Sandbox:

```text
PADDLE_API_KEY=pdl_sdbx_apikey_...
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_PREMIUM_PRICE_ID=pri_...
PADDLE_ENVIRONMENT=sandbox
```

Production:

```text
PADDLE_API_KEY=pdl_live_apikey_...
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_PREMIUM_PRICE_ID=pri_...
PADDLE_ENVIRONMENT=production
```

Missing, invalid, or cross-environment configuration disables billing endpoints with HTTP 503 without disabling recommendations or Training quota APIs.

## 6. Vite frontend environment

Sandbox:

```text
VITE_PADDLE_CLIENT_TOKEN=test_...
VITE_PADDLE_ENVIRONMENT=sandbox
```

Production:

```text
VITE_PADDLE_CLIENT_TOKEN=live_...
VITE_PADDLE_ENVIRONMENT=production
```

The client token is public by design. It cannot grant an Edulience entitlement. The verified webhook and Firebase Admin remain authoritative.

## 7. Server-owned Firestore data

```text
billingAccounts/{firebaseUid}
paddleCustomers/{paddleCustomerId}
paddleWebhookEvents/{paddleEventId}
users/{firebaseUid}/entitlements/current
```

Do not add browser access rules for the three top-level billing collections. Keep browser writes denied for the entitlement document. Verify deployed rules contain no broad top-level allow before deployment.

## 8. Environment verification

1. Confirm the backend and frontend environment selectors match.
2. Confirm the API key, client token, price ID, and webhook secret all come from that environment.
3. Sign in with a Firebase account that has a verified email claim.
4. Open `/training` and select **Upgrade to Premium**.
5. Confirm Paddle Checkout opens as an overlay for the server-created transaction.
6. Complete a payment using the selected environment's supported payment flow.
7. Confirm the page shows `Confirming Premium...` while it polls `/api/training/access` for a bounded period.
8. Verify `users/{uid}/entitlements/current` becomes `plan: "premium"`, `source: "paddle"`.
9. Confirm Training becomes unlimited and can exceed the Free quota.
10. Select **Manage subscription** and confirm the temporary Customer Portal overview opens.
11. Schedule cancellation at period end.
12. Confirm Premium remains while Paddle reports `active` or `trialing`.
13. Confirm a later `canceled`, `paused`, or `past_due` state returns the Paddle-derived entitlement to Free.
14. Confirm a valid `source: "manual"` Premium override survives a Paddle downgrade.

Customer Portal URLs are temporary and are never stored. Before accepting real payments, repeat the complete purchase, portal, cancellation, entitlement, quota, and webhook test sequence using the Live catalog and credentials.
