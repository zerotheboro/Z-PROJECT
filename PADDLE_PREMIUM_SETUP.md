# Edulience Premium — Paddle Billing sandbox setup

Phase 2B is intentionally restricted to Paddle Billing sandbox. Do not use live credentials or accept real payments until the integration has been reviewed separately for production.

## 1. Create the sandbox catalog

1. Create or open a Paddle sandbox account.
2. Create a product named `Edulience Premium`.
3. Create one recurring Premium price.
4. Configure `PADDLE_PREMIUM_PRICE_ID=pri_01m4b4yepsh970g4z40hf525ng` for the current development catalog.

The application never creates products or prices automatically.

## 2. Create sandbox credentials

1. Create a sandbox API key with customer, transaction, subscription, and customer-portal permissions. Store it on Render as `PADDLE_API_KEY`.
2. Create a sandbox client-side token. Store it in the Vite build environment as `VITE_PADDLE_CLIENT_TOKEN`.

The server API key must contain `_sdbx_`. The browser token must start with `test_`. Never place the API key or webhook secret in a `VITE_*` variable.

## 3. Configure the Default payment link

Paddle Checkout requires a Default payment link. Configure it in Paddle Checkout settings. Sandbox may use an approved Edulience URL or `https://localhost/` where Paddle permits it. Application code does not configure this setting.

## 4. Configure the webhook destination

Create this sandbox notification destination:

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

Copy the destination secret into `PADDLE_WEBHOOK_SECRET`. It normally starts with `pdl_ntfset_`.

## 5. Render server environment

```text
PADDLE_API_KEY=pdl_sdbx_...
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_PREMIUM_PRICE_ID=pri_01m4b4yepsh970g4z40hf525ng
PADDLE_ENVIRONMENT=sandbox
```

Missing or non-sandbox configuration disables billing endpoints with HTTP 503 without disabling recommendations or Training quota APIs.

## 6. Vite frontend environment

```text
VITE_PADDLE_CLIENT_TOKEN=test_...
VITE_PADDLE_ENVIRONMENT=sandbox
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

## 8. Sandbox verification

1. Sign in with a Firebase account that has a verified email claim.
2. Open `/training` and select **Upgrade to Premium**.
3. Confirm Paddle Checkout opens as an overlay for the server-created transaction.
4. Complete a Paddle sandbox payment.
5. Confirm the page shows `Confirming Premium...` while it polls `/api/training/access` for a bounded period.
6. Verify `users/{uid}/entitlements/current` becomes `plan: "premium"`, `source: "paddle"`.
7. Confirm Training becomes unlimited and can exceed the Free quota.
8. Select **Manage subscription** and confirm the temporary Customer Portal overview opens.
9. Schedule cancellation at period end.
10. Confirm Premium remains while Paddle reports `active` or `trialing`.
11. Confirm a later `canceled`, `paused`, or `past_due` state returns the Paddle-derived entitlement to Free.
12. Confirm a valid `source: "manual"` Premium override survives a Paddle downgrade.

Customer Portal URLs are temporary and are never stored.

## 9. Future sandbox-to-live migration

Live migration is a separate task. It requires production account approval, a live product and price, live credentials, a new webhook destination secret, an approved production Default payment link, both environment selectors changed to `production`, removal of the current sandbox-only guards after security review, and a complete repeat of purchase, portal, cancellation, entitlement, quota, and webhook tests.

Sandbox IDs and credentials do not work in Paddle live mode.
