# Firestore training-progress rule setup

The repository currently contains the scoped rule fragment in
`firestore.training-progress.rules`, but it does not contain a complete
Firebase CLI rules deployment configuration. The fragment is therefore not
live merely because it is present in this working tree.

## Apply the rule manually

1. Open the Firebase Console.
2. Select project **edulience-920ba**.
3. Open **Firestore Database**.
4. Open the **Rules** tab.
5. In the existing ruleset, find the existing
   `match /databases/{database}/documents` block.
6. Merge this block inside it, alongside the rules for the existing
   collections:

   ```text
   match /users/{userId}/trainingProgress/{draftId} {
     allow read: if request.auth != null
       && request.auth.uid == userId
       && draftId == "active";

     allow create, update: if request.auth != null
       && request.auth.uid == userId
       && draftId == "active"
       && request.resource.data.schemaVersion == 1
       && request.resource.data.sessionId is string
       && request.resource.data.owner.kind == "user"
       && request.resource.data.owner.uid == request.auth.uid
       && request.resource.data.mode in ["auto", "manual"];

     allow delete: if request.auth != null
       && request.auth.uid == userId
       && draftId == "active";
   }
   ```

7. Review the complete ruleset, use the Rules Playground to verify that an
   authenticated user can read and write only their own
   `/users/{userId}/trainingProgress/{draftId}` document, and then publish the
   merged rules in the Firebase Console.

**Do not paste `firestore.training-progress.rules` as the entire Firestore
rules file.** It is intentionally a standalone fragment and replacing the
whole ruleset with it could remove protection or access required by unrelated
collections.

No rule for any unrelated collection is added or changed by this setup.

## Optional Firebase CLI path

Only use the Firebase CLI after the repository has a reviewed, complete
Firestore rules file and a `firebase.json` that points `firestore.rules` to
that complete file. At that point the scoped deployment command is:

```text
firebase deploy --only firestore:rules --project edulience-920ba
```

Do not run that command against the standalone fragment.
