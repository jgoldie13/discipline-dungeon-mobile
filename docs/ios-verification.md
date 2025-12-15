# iPhone Screen Time verification (iOS companion → web backend)

The web app cannot read iPhone Screen Time. A native iOS companion app uploads daily verified minutes to the web backend.

## Authentication

Use Supabase Auth access tokens.

- Send `Authorization: Bearer <supabase_access_token>`
- The backend accepts cookie sessions (web) or Bearer tokens (iOS) via `requireUserFromRequest()`.

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

