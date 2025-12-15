# iOS companion scaffold (SwiftUI)

This repo includes an iOS companion app scaffold at:

- `ios/DisciplineDungeonCompanion/DisciplineDungeonCompanion.xcodeproj`

It signs in with Supabase Auth, requests Screen Time authorization, captures a Screen Time selection, and uploads daily verified minutes to the web backend (Phase 3.5 PR A).

## Prerequisites

- Xcode 15+
- Apple Developer account (some Screen Time capabilities require additional approval from Apple)
- Supabase project URL + anon key (same values as the web app)

## Configuration

In Xcode, open `ios/DisciplineDungeonCompanion/DisciplineDungeonCompanion.xcodeproj`, then set:

- `Info.plist` keys:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `DEFAULT_WEB_BASE_URL` (can also be changed in-app)

No secrets are committed; Supabase anon keys are public by design.

## Capabilities / entitlements

To actually request Screen Time authorization and present the picker, enable:

- Family Controls (`FamilyControls`)
- Device Activity (`DeviceActivity`)
- Managed Settings (`ManagedSettings`)

Apple typically requires adding the corresponding capabilities in the Xcode Signing & Capabilities tab.

## What works today vs TODO (radical honesty)

- ✅ Sign in (email + password) via `supabase-swift` and store access token in Keychain
- ✅ Request authorization (may fail without proper entitlements/capabilities)
- ✅ Pick apps/categories (selection persisted locally; uploaded as base64 in `raw`)
- ✅ Upload plumbing:
  - `POST /api/verification/ios/upload` with `Authorization: Bearer <accessToken>`
  - payload includes `date`, `verifiedMinutes` (currently a labeled stub), and `raw` device metadata
- ✅ Update backend connection timezone:
  - `PATCH /api/verification/ios/connection`

### TODO: real Screen Time minutes computation

This scaffold does **not** pretend to compute Screen Time minutes yet.

The realistic next step is a DeviceActivity report extension:

- Add a report extension target
- Use an App Group to share computed totals (date → minutes) with the main app
- Main app uploads the computed “yesterday” summary using the same Bearer token

## Manual QA (against preview backend)

1. Deploy PR A backend (or run locally).
2. Build + run the iOS app.
3. Sign in with the same Supabase project as the web app.
4. In Settings tab, set `Web Base URL` to your backend URL and save timezone to backend.
5. In Upload tab, tap Upload Yesterday (verified minutes is a stub until the report extension exists).
