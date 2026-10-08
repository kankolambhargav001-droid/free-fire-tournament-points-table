# Organizer accounts and private tournament data

This version uses Firebase Authentication + Firestore for production organizer data.

## 1. Enable email/password sign-in

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

Google sign-in is no longer used by the organizer portal.

## 2. Create an organizer account

Firebase Console → Authentication → Users → Add user.

Example:
- Email: `admin1@gmail.com`
- Password: choose the password you will give that organizer

There is intentionally no Sign Up button in the website.

## 3. Approve the organizer

After creating the user, copy the user's Firebase **UID**.

Firebase Console → Firestore Database → create collection:

`organizerAccess`

Create a document whose document ID is exactly that Firebase UID.

Fields:

```text
enabled: true
email: admin1@gmail.com
```

Only an approved organizer can enter the application or read/write private tournament data.

## 4. Private tournament ownership

Each organizer's tournaments are stored under:

`organizers/{UID}/tournaments/{tournamentId}`

Firestore rules enforce that an organizer can only access their own UID namespace.

Example:
- `admin1@gmail.com` sees only tournaments created by UID A.
- `admin2@gmail.com` sees only tournaments created by UID B.
- Neither organizer can read the other's private tournament records.

## 5. Public results

When an organizer publishes a tournament, the public results snapshot is stored separately under:

`tournaments/{publicId}`

Anyone with the public results URL can view that published snapshot without an organizer account.

## 6. Existing test/demo data

The previous mock/seed tournament is no longer loaded. A new organizer starts with an empty tournament list and only sees tournaments loaded from their own Firestore account.
