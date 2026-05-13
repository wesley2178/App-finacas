# Security Specification - Access Control System

## Data Invariants
1. An authorized user document must contain a valid `email` (string), `active` (boolean), and `created_at` (timestamp).
2. Users are verified solely by looking up their email in the `authorized_users` collection.
3. No user authentication (Firebase Auth) is used, so security relies on document existence and the `active` flag.

## The "Dirty Dozen" Payloads (Writability Protection)
Since all client-side writes are prohibited, any attempt to create, update, or delete users via the SDK will return PERMISSION_DENIED.

1. Attempting to create an authorized user with `active: true`.
2. Attempting to modify `active` state of an existing user.
3. Attempting to delete a user document.
4. Attempting to batch write unauthorized emails.
... (All write payloads will be blocked)

## Firestore Rules Strategy
- **Read**: Allow `list` queries so the app can check if an email exists.
- **Write**: Deny all. Users must be added manually via Firebase Console as per user request.

## Rules Draft
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global Deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Authorized Users Collection
    match /authorized_users/{userId} {
      // Allow finding a user by email query
      // Since no Auth is used, we have to allow public read specifically for this lookup
      allow list: if true; 
      allow get: if false;
      allow write: if false;
    }
  }
}
```
