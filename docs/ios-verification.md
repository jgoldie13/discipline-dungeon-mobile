# iPhone Screen Time verification (iOS companion → web backend)

The web app cannot read iPhone Screen Time. A native iOS companion app uploads daily verified minutes to the web backend.

## Authentication

Use Supabase Auth access tokens.

- Send `Authorization: Bearer <supabase_access_token>`
- The backend accepts cookie sessions (web) or Bearer tokens (iOS) via `requireUserFromRequest()`.

### Getting an access token (dev)

This app uses email + password auth. For local/dev testing, you can obtain a token with `@supabase/supabase-js`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
EMAIL=you@example.com
PASSWORD=...

node -e "const {createClient}=require('@supabase/supabase-js'); (async()=>{ const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); const {data,error}=await sb.auth.signInWithPassword({email:process.env.EMAIL,password:process.env.PASSWORD}); if(error) throw error; console.log(data.session.access_token); })().catch(e=>{console.error(e);process.exit(1)})"
```

## Endpoints

### Connection settings (web or iOS)

`GET /api/verification/ios/connection`

Response:
```json
{ "enabled": false, "timezone": "UTC", "lastSyncAt": null, "selection": null }
```

`PATCH /api/verification/ios/connection`

Body (partial):
```json
{ "enabled": true, "timezone": "America/Los_Angeles", "selection": { "apps": ["..."] } }
```

### Upload daily Screen Time snapshot (iOS)

`POST /api/verification/ios/upload`

Headers:
- `Authorization: Bearer <supabase_access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "date": "YYYY-MM-DD",
  "verifiedMinutes": 123,
  "raw": { "optional": "provider payload" }
}
```

Response:
```json
{ "date": "YYYY-MM-DD", "status": "match", "deltaMinutes": 0 }
```

Notes:
- Do not send `userId` in the body; the server derives it from auth.
- `raw` is stored as-is for auditability.
- Uploading is safe to repeat: it upserts `(userId, date)` and applies penalties idempotently.

## Device-side behavior (recommended)

- Compute “yesterday” in the user’s chosen timezone.
- Upload on app open (and optionally on background refresh).
- Retry safe: multiple uploads for the same date are deduped.

## Scripted upload smoke test

Use `scripts/test-ios-upload.mjs` to call the upload route with a Bearer token:

```bash
BASE_URL=http://localhost:3002
ACCESS_TOKEN=...
DATE=2025-01-02
MINUTES=42

node scripts/test-ios-upload.mjs
```
