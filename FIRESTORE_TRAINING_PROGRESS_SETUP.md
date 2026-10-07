# Firestore training-progress rule setup

The repository currently contains the scoped rule fragment in
`firestore.training-progress.rules`, including owner-only daily Training
activity, streak-summary, entitlement, and Training-quota rules, but it does not contain a complete
Firebase CLI rules deployment configuration. The fragment is therefore not
live merely because it is present in this working tree.

## Apply the rule manually

1. Open the Firebase Console.
2. Select project **edulience-920ba**.
3. Open **Firestore Database**.
4. Open the **Rules** tab.
5. In the existing ruleset, find the existing
   `match /databases/{database}/documents` block.
6. Merge all scoped blocks from `firestore.training-progress.rules`
   inside it, alongside the rules for the existing collections. These are
   the blocks for:

   - `/users/{userId}/trainingProgress/{draftId}`
   - `/users/{userId}/trainingActivity/{dayKey}`
   - `/users/{userId}/trainingStats/{statsId}`
   - `/users/{userId}/entitlements/{entitlementId}`
   - `/users/{userId}/trainingUsage/{dayKey}`
   - `/users/{userId}/trainingUsage/{dayKey}/reservations/{sessionId}`
   - `/users/{userId}/trainingReservations/{sessionId}`

   The complete reviewed fragment is the source of truth; do not copy only
   the older draft block. The updated `trainingProgress` create rule requires
   the server-created reservation index. Its update rule deliberately
   grandfathers existing unfinished drafts only while their `sessionId`
   remains unchanged.

   If the live ruleset contains a broad recursive user rule such as
   `match /users/{userId}/{collectionId}/{document=**}`, add all protected
   collections to its exclusions. The condition must include:

   ```text
   collectionId != "trainingProgress"
   && collectionId != "trainingActivity"
   && collectionId != "trainingStats"
   && collectionId != "entitlements"
   && collectionId != "trainingUsage"
   && collectionId != "trainingReservations"
   ```

   Without these exclusions, a broad allow can bypass the dedicated
   server-only write rules.

7. Review the complete ruleset, use the Rules Playground to verify that an
   authenticated user can access only their own Training draft, activity,
   and streak documents. Confirm that entitlement, usage, daily reservation,
   and reservation-index writes are denied to the browser. Confirm a new
   Training draft is allowed only when its matching reservation-index
   document exists, while an existing draft can keep its unchanged legacy
   session ID. Then publish the merged rules in the Firebase Console.

**Do not paste `firestore.training-progress.rules` as the entire Firestore
rules file.** It is intentionally a standalone fragment and replacing the
whole ruleset with it could remove protection or access required by unrelated
collections.

No rule for any unrelated collection is added or changed by this setup.

## Phase 2A entitlement and quota records

The trusted backend uses these paths:

- `users/{uid}/entitlements/current`
- `users/{uid}/trainingUsage/{YYYY-MM-DD}`
- `users/{uid}/trainingUsage/{YYYY-MM-DD}/reservations/{sessionId}`
- `users/{uid}/trainingReservations/{sessionId}`

Missing entitlement data means Free. To test Premium before Stripe, create
or edit `users/{uid}/entitlements/current` through Firebase Console/Admin
tooling only:

```text
plan: "premium"
source: "manual"
updatedAt: <server timestamp>
validUntil: null
```

Set `validUntil` to a future Firestore Timestamp for temporary access. A
past timestamp is treated as Free. Never add client write permission for
this document.

Guest quota data is stored only in that browser under
`edulience.training-access.v1.guest`. It can be bypassed by clearing browser
storage and is not security-equivalent to signed-in enforcement.

## Optional Firebase CLI path

Only use the Firebase CLI after the repository has a reviewed, complete
Firestore rules file and a `firebase.json` that points `firestore.rules` to
that complete file. At that point the scoped deployment command is:

```text
firebase deploy --only firestore:rules --project edulience-920ba
```

Do not run that command against the standalone fragment.
