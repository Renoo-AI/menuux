# Firebase Configuration Fix Report

## Error
```
Firebase: Error (auth/invalid-api-key)
```

## Root Cause
The `.env` file is missing all Firebase environment variables. The current `.env` file only contains:
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

## Missing Environment Variables
The following environment variables must be set:

```bash
# Required Firebase Client Config (public, safe for browser)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Required for Server-Side Admin Operations
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# SuperAdmin UID (should NOT be NEXT_PUBLIC - needs fixing)
SUPERADMIN_UID=your-superadmin-uid
```

## Files Involved
- `/home/z/my-project/.env` - Missing Firebase config
- `/home/z/my-project/src/lib/firebase.ts` - Reads env vars for client SDK
- `/home/z/my-project/src/lib/admin-auth.ts` - Reads env vars for Admin SDK

## How to Fix

### Step 1: Get Firebase Config from Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project (menuxtn)
3. Go to Project Settings > General
4. Scroll to "Your apps" section
5. Copy the config values from the web app config

### Step 2: Get Service Account for Admin SDK
1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely
4. Extract `client_email` and `private_key` values

### Step 3: Update .env.local (for local dev)
Create or update `.env.local` with all the values above.

### Step 4: Update Vercel Environment Variables
1. Go to Vercel Dashboard > Project Settings > Environment Variables
2. Add all the variables listed above
3. Do NOT expose FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY to the client

## Security Notes
1. NEXT_PUBLIC_ prefixed variables are exposed to the browser - only safe for client SDK config
2. FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must remain server-only
3. SUPERADMIN_UID should NOT have NEXT_PUBLIC_ prefix (security issue - to be fixed separately)

## Current Status
- Firebase Error: UNRESOLVED - requires environment configuration
- App cannot function without Firebase configuration
- Security features dependent on Firebase will not work

## Quick Test Command
After adding env vars, restart dev server and check:
```bash
bun run dev
# Visit /admin/login - should not show "invalid-api-key" error
```
