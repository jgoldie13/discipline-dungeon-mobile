# iOS Screen Time Report Diagnostics & Troubleshooting

This document covers diagnostic tools, common issues, and fixes for the iOS Screen Time reporting feature.

## Quick Start: Running Diagnostics

### In-App Diagnostics

1. Open iOS companion app on device
2. Navigate to **Diagnostics** tab
3. Tap **Run App Group Self-Test**
4. Look for ✓ (pass) or ✗ (fail) markers

**Expected Success Output:**
```
✓ Container URL accessible
✓ UserDefaults accessible
✓ Write test value succeeded
✓ Read test value succeeded: test-<timestamp>
✓ Heartbeat file write succeeded
```

**If ANY test fails:**
- Problem is App Group provisioning
- Follow "Fixing Provisioning Issues" below

### Command-Line Diagnostics

From your Mac terminal:

```bash
cd ios-companion
./scripts/verify_entitlements.sh
```

**Expected Success Output:**
```
✓ ALL CHECKS PASSED
```

**If checks fail:**
- Follow script's recommended next steps
- See "Fixing Provisioning Issues" below

## Common Issues & Solutions

### Issue 1: "No snapshot found" after computing

**Symptoms:**
- User taps "Compute yesterday minutes"
- Sheet appears with report
- After Done, "No computed value yet" persists
- Debug timestamps show 0.0

**Root Cause:**
Extension not running OR App Group inaccessible

**Diagnostic Steps:**
1. Check Diagnostics tab → Run self-test
   - If PASS: Extension not running (see Console logs)
   - If FAIL: Provisioning issue (see "Fixing Provisioning Issues")

2. Check Console.app (Mac):
   - Filter: `subsystem:com.disciplinedungeon.ios-companion`
   - Trigger compute again
   - Look for extension logs

**Expected Logs (Success):**
```
🚀 Extension makeConfiguration called at <date>
✓ App Group accessible: <path>
📋 Request loaded: date=2025-12-20 timezone=America/New_York
📊 Computed duration: 143 minutes
✓ Snapshot saved to UserDefaults
✓ Snapshot file written to: <path>
✅ Extension completed in 0.23 seconds
```

**No Logs Appear:**
- Extension not launching (provisioning issue)
- Run entitlement script
- Rebuild and reinstall

**Error Logs:**
```
❌ CRITICAL: App Group UserDefaults unavailable
```
→ Provisioning issue, follow fix steps below

### Issue 2: "Shared container unavailable" banner

**Symptoms:**
- Orange/red banner in Yesterday tab
- "This is usually an App Group provisioning issue"

**Root Cause:**
App Group container is nil at runtime

**Solution:**
This is ALWAYS a provisioning issue. Follow "Fixing Provisioning Issues" below.

### Issue 3: Extension runs but returns 0 minutes

**Symptoms:**
- Diagnostics pass
- Logs show extension ran
- Result is always 0 minutes

**Possible Causes:**
1. No apps selected in Selection tab
2. Screen Time permission not granted
3. Filter date range is empty (no usage yesterday)
4. Timezone mismatch

**Diagnostic Steps:**
1. Check Selection tab → ensure apps/categories selected
2. Check Setup tab → Screen Time status should be "approved"
3. Check Yesterday tab → verify target date is correct
4. Check device Screen Time settings → ensure data exists for yesterday

## Fixing Provisioning Issues

### Step 1: Verify Apple Developer Portal

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Find your app bundle ID (e.g., `com.disciplinedungeon.ios-companion`)
4. Click to edit → Scroll to **App Groups**
5. Ensure it's **enabled** and **configured**
6. Click **Configure** → Ensure `group.com.disciplinedungeon.shared` is **checked**
7. **Save**
8. Repeat for extension bundle ID (e.g., `com.disciplinedungeon.ios-companion.ScreenTimeReportExtension`)

### Step 2: Verify Xcode Capabilities

1. Open `DisciplineDungeonIOSCompanion.xcodeproj` in Xcode
2. Select **DisciplineDungeonIOSCompanion** target
3. Go to **Signing & Capabilities** tab
4. Ensure **App Groups** capability exists
   - If not: Click **+ Capability** → Add **App Groups**
5. Ensure `group.com.disciplinedungeon.shared` is **checked**
6. Switch to **ScreenTimeReportExtension** target
7. Repeat steps 4-5

### Step 3: Regenerate Provisioning Profiles

**Option A: Automatic Signing (Recommended)**
1. In Xcode, select both targets
2. **Signing & Capabilities** → Enable **Automatically manage signing**
3. Select your Team
4. Xcode will regenerate profiles automatically

**Option B: Manual Signing**
1. Xcode → **Preferences** → **Accounts**
2. Select your Apple ID → **Manage Certificates**
3. Click **Download Manual Profiles**
4. In project settings, select the new profiles

### Step 4: Clean Build and Reinstall

**CRITICAL:** Old builds won't pick up new provisioning profiles

1. In Xcode: **Product** → **Clean Build Folder** (Cmd+Shift+K)
2. Delete app from device (long-press icon → Remove App)
3. Build and run from Xcode (Cmd+R)
4. After install, run diagnostics again

**Verification:**
```bash
cd ios-companion
./scripts/verify_entitlements.sh
```
Should show `✓ ALL CHECKS PASSED`

## Using the Entitlement Verification Script

### Location
```
ios-companion/scripts/verify_entitlements.sh
```

### Basic Usage
```bash
cd ios-companion
./scripts/verify_entitlements.sh
```

The script will:
1. Search DerivedData for most recent build
2. Extract embedded entitlements from .app and .appex
3. Check for required capabilities:
   - `group.com.disciplinedungeon.shared`
   - `com.apple.developer.family-controls`
4. Report PASS or FAIL

### Manual Path
If script can't auto-find your build:
```bash
./scripts/verify_entitlements.sh /path/to/DerivedData/.../DisciplineDungeonIOSCompanion.app
```

### Expected Output (Success)
```
=========================================
HOST APP ENTITLEMENTS
=========================================
✓ Entitlements extracted successfully
✓ App Group present: group.com.disciplinedungeon.shared
✓ Family Controls capability present

=========================================
EXTENSION ENTITLEMENTS
=========================================
✓ Entitlements extracted successfully
✓ App Group present: group.com.disciplinedungeon.shared
✓ Family Controls capability present

=========================================
FINAL RESULT
=========================================
✓ ALL CHECKS PASSED
```

### Interpreting Failures

**✗ FAIL: App Group missing**
- Entitlement plist has it, but not embedded in binary
- Provisioning profile doesn't include App Group
- Regenerate profiles (see Step 3 above)

**✗ FAIL: Family Controls missing**
- Required for Screen Time APIs
- Add capability in Xcode
- Regenerate profiles

**Could not extract entitlements**
- Binary not signed properly
- Rebuild from Xcode
- Check signing settings

## Viewing Extension Logs

Extension uses OSLog for detailed debugging.

### Using Console.app (macOS)

1. Connect iPhone to Mac via cable
2. Open **Console.app** (in /Applications/Utilities)
3. Select your iPhone from sidebar
4. Click **Start** streaming
5. In search bar, enter:
   ```
   subsystem:com.disciplinedungeon.ios-companion
   ```
6. Trigger "Compute yesterday minutes" in app
7. Watch for logs in real-time

### Using Xcode Console

1. Connect iPhone to Mac
2. Xcode → **Window** → **Devices and Simulators**
3. Select your iPhone → Click **Open Console**
4. Filter by: `subsystem:com.disciplinedungeon.ios-companion`
5. Trigger compute

### Log Markers

**Extension Start:**
```
🚀 Extension makeConfiguration called at <timestamp>
```

**App Group Check:**
```
✓ App Group accessible: /path/to/container
```
OR
```
❌ CRITICAL: App Group UserDefaults unavailable - provisioning issue
```

**Request Loaded:**
```
📋 Request loaded: date=2025-12-20 timezone=America/New_York
```

**Computation:**
```
📊 Computed duration: 143 minutes (8580 seconds)
```

**Snapshot Saved:**
```
✓ Snapshot saved to UserDefaults: 143 minutes for 2025-12-20
✓ Snapshot file written to: /path/to/dd_snapshot.json
```

**Completion:**
```
✅ Extension completed in 0.23 seconds
```

### No Logs Appearing

If you see NO logs at all:
1. Extension is not running
2. Likely provisioning issue
3. Run entitlement verification script
4. Check Console filter is correct: `subsystem:com.disciplinedungeon.ios-companion`

## Testing Procedure

### Prerequisites
- Physical iOS device (Screen Time APIs don't work in Simulator)
- Device signed in with Apple ID
- Screen Time enabled (Settings → Screen Time)
- App built and installed from Xcode

### Full Test Flow

**1. Setup Tab**
- Enter Supabase access token
- Enter base URL
- Tap "Save"
- Tap "Request Screen Time access" → Grant permission
- Verify status shows "approved"

**2. Selection Tab**
- Use picker to select apps/categories to track
- Tap "Save selection locally"
- Verify summary shows count > 0
- Tap "Sync selection + timezone to backend"

**3. Diagnostics Tab**
- Tap "Run App Group Self-Test"
- Verify all 5 checks show ✓
- Tap "Refresh Snapshot Dump"
- Should show container URL and key status

**4. Yesterday Tab**
- Verify "Target date" shows yesterday's date
- Ensure NO banner about "shared container unavailable"
- Tap "Compute yesterday minutes"
- **Wait for countdown** (10 seconds, Done button disabled)
- Tap "Done" when enabled
- Verify "Latest computed" shows minutes value
- Tap "Upload yesterday"
- Verify upload result line shows success

**5. Verify in Console.app (Optional)**
- Open Console.app on Mac
- Filter by subsystem
- Trigger compute again
- Confirm extension logs appear with success markers

### Expected Behavior

✓ Countdown enforces 10-second minimum open time
✓ Done button disabled until countdown reaches 0
✓ Retry logic attempts to read snapshot up to 6 times
✓ Fallback reads from both UserDefaults AND file
✓ Clear error messages if App Group unavailable
✓ Diagnostics tab shows real-time App Group health

## Advanced Debugging

### Inspecting App Group Container

**From Console.app logs:**
Look for:
```
✓ App Group accessible: /private/var/mobile/Containers/Shared/AppGroup/<UUID>
```

**From device (requires jailbreak or Xcode debugger):**
Container path changes per install, but structure:
```
/var/mobile/Containers/Shared/AppGroup/<UUID>/
  dd_heartbeat.txt          ← Heartbeat marker
  dd_snapshot.json          ← Snapshot file (redundancy)
  Library/Preferences/      ← UserDefaults plist
```

### Snapshot Debug Dump Keys

In Diagnostics tab, "Refresh Snapshot Dump" shows:

| Key | Meaning |
|-----|---------|
| `dd.screentime.request.v1` | Computation request (date, timezone) |
| `dd.screentime.snapshot.v1` | Snapshot result (JSON) |
| `dd_ext_invoked_ts` | Extension start timestamp |
| `dd_ext_completed_ts` | Extension end timestamp |
| `dd_ext_invoked_note` | Start debug message |
| `dd_ext_completed_note` | End debug message |
| `dd_ext_last_error` | Last error from extension |

**Healthy State:**
- `dd_ext_invoked_ts` > 0 (recent)
- `dd_ext_completed_ts` > 0 (recent)
- `dd_ext_last_error` absent or nil
- `dd.screentime.snapshot.v1` present

**Broken State:**
- All timestamps = 0.0
- `dd_ext_last_error` = "AppGroupUnavailable"
- Keys missing entirely

## Checklist: New Device Setup

Use this checklist when setting up the app on a new device:

- [ ] Device signed in with Apple ID
- [ ] Screen Time enabled (Settings → Screen Time)
- [ ] App installed from Xcode (not TestFlight or App Store for development)
- [ ] Diagnostics self-test shows all ✓
- [ ] Entitlement script shows PASS
- [ ] Screen Time permission granted ("approved")
- [ ] Apps/categories selected
- [ ] Test compute shows non-zero minutes
- [ ] Console.app shows extension logs

## When to Contact Support

If after following ALL steps above:
- ✓ Diagnostics self-test passes
- ✓ Entitlement script passes
- ✓ Extension logs appear in Console
- ✓ Extension completes successfully
- ✓ But still no data appears

Then:
1. Check Console logs for actual computed duration
2. If duration is 0, verify device had Screen Time usage yesterday
3. If duration is > 0 but not appearing, check retry logic (should see 6 attempts in host app logs)
4. File issue with full logs

## Reference Links

- Apple DeviceActivity Docs: [developer.apple.com/documentation/deviceactivity](https://developer.apple.com/documentation/deviceactivity)
- Apple App Groups Guide: [developer.apple.com/documentation/xcode/configuring-app-groups](https://developer.apple.com/documentation/xcode/configuring-app-groups)
- Apple Family Controls: [developer.apple.com/documentation/familycontrols](https://developer.apple.com/documentation/familycontrols)
