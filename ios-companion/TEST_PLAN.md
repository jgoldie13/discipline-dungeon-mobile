# iOS Screen Time Report - Test Plan

## Overview

This test plan covers verification of the Screen Time Report feature after implementing diagnostic improvements, retry logic, and UX enhancements.

## Test Environment

### Required Hardware/Software
- Physical iOS device (iPhone/iPad running iOS 15+)
- macOS with Xcode installed
- Device and Mac on same network (for initial setup)
- Device signed in with Apple ID
- Screen Time enabled on device

### Pre-Test Setup
1. Build project from Xcode (Product → Build, Cmd+B)
2. Install on physical device (Product → Run, Cmd+R)
3. Keep device connected to Mac for Console.app monitoring

## Test Suite

### Test 1: App Group Provisioning Verification

**Objective:** Verify App Group is correctly provisioned and embedded

**Steps:**
1. From terminal, run:
   ```bash
   cd ios-companion
   ./scripts/verify_entitlements.sh
   ```

**Expected Result:**
```
✓ ALL CHECKS PASSED

Host app entitlements:
  ✓ App Group present: group.com.disciplinedungeon.shared
  ✓ Family Controls capability present

Extension entitlements:
  ✓ App Group present: group.com.disciplinedungeon.shared
  ✓ Family Controls capability present
```

**Pass Criteria:**
- Script exits with success (exit code 0)
- All checks show ✓ (green)
- No ✗ (red) markers

**If Failed:**
- Follow script's recommended next steps
- Regenerate provisioning profiles
- Clean build and reinstall
- Re-run test

---

### Test 2: In-App Diagnostics Self-Test

**Objective:** Verify App Group accessible at runtime from host app

**Steps:**
1. Launch app on device
2. Navigate to **Diagnostics** tab (4th tab)
3. Tap **Run App Group Self-Test**
4. Observe output text

**Expected Result:**
```
✓ Container URL accessible
✓ UserDefaults accessible
✓ Write test value succeeded
✓ Read test value succeeded: test-<timestamp>
✓ Heartbeat file write succeeded
```

**Pass Criteria:**
- All 5 checks show ✓
- Report text is green (not red)
- Container URL path displayed in "Container Info" section

**If Failed:**
- Red text or ✗ markers → provisioning issue
- Run Test 1 (entitlement script)
- Follow provisioning fix steps in DIAGNOSTICS_AND_TROUBLESHOOTING.md

---

### Test 3: Screen Time Permission Request

**Objective:** Verify app can request and obtain Screen Time access

**Steps:**
1. Navigate to **Setup** tab
2. Observe "Screen Time permission" section
3. Note current status (should show "notDetermined" on fresh install)
4. Tap **Request Screen Time access**
5. iOS system prompt appears
6. Grant permission
7. Wait 2 seconds
8. Observe status update

**Expected Result:**
- Status changes from "notDetermined" to "approved"

**Pass Criteria:**
- Status shows "approved"
- No error messages

**If Failed:**
- Status shows "denied" → User denied permission, go to Settings → Screen Time → allow app
- No prompt appeared → Family Controls entitlement missing, run Test 1

---

### Test 4: App Selection and Sync

**Objective:** Verify app/category selection persists and syncs to backend

**Steps:**
1. Navigate to **Selection** tab
2. Tap into **FamilyActivityPicker** area
3. Select at least 3 apps or 1 category
4. Tap outside picker to dismiss
5. Tap **Save selection locally**
6. Observe selection summary updates
7. Enter credentials in Setup tab (access token + base URL)
8. Return to Selection tab
9. Tap **Sync selection + timezone to backend**
10. Wait for response

**Expected Result:**
- Selection summary shows: "Apps: 3 • Categories: 0 • Web: 0" (or similar)
- After save: Status message "Selection saved."
- After sync: "Synced connection: enabled=true tz=<timezone>"

**Pass Criteria:**
- Selection persists (summary shows counts > 0)
- Sync succeeds with HTTP 200 response

**If Failed:**
- Selection not persisting → Check Diagnostics (App Group issue)
- Sync fails → Check credentials, network, backend URL

---

### Test 5: Snapshot Debug Dump

**Objective:** Verify snapshot keys are accessible before compute

**Steps:**
1. Navigate to **Diagnostics** tab
2. Tap **Refresh Snapshot Dump**
3. Observe output

**Expected Result (Before First Compute):**
```
✓ Container URL: /var/mobile/Containers/Shared/AppGroup/<UUID>
✓ UserDefaults: accessible
  - dd.screentime.request.v1: nil
  - dd.screentime.snapshot.v1: nil
  - dd_ext_invoked_ts: nil
  - dd_ext_completed_ts: nil
  ...
```

**Pass Criteria:**
- Container URL shown (not nil)
- UserDefaults accessible
- Keys may be nil/absent before first compute (expected)

---

### Test 6: Compute Yesterday Minutes - Happy Path

**Objective:** Test full compute flow with countdown enforcement

**Pre-requisite:**
- Tests 1-5 passed
- Screen Time permission approved
- Apps/categories selected
- Device has Screen Time data for yesterday

**Steps:**
1. Open Console.app on Mac:
   - Select iPhone from sidebar
   - Click "Start" streaming
   - Filter: `subsystem:com.disciplinedungeon.ios-companion`

2. On device, navigate to **Yesterday** tab

3. Verify no "Shared container unavailable" banner appears

4. Note "Target date" (should be yesterday's date)

5. Tap **Compute yesterday minutes**

6. Sheet appears with title "Yesterday Report"

7. Observe guidance text:
   - "Keep this open for 10 more seconds" (orange)
   - Countdown decrements: 10, 9, 8...

8. Observe Done button is **disabled** (grayed out)

9. Wait for countdown to reach 0

10. Guidance text changes:
    - "Report generation complete. You can now close this." (green)

11. Done button becomes **enabled**

12. Tap **Done**

13. Sheet dismisses

14. Observe "Latest computed" section updates

15. Check Console.app logs

**Expected Result:**

**In App:**
- Countdown enforced for 10 seconds
- Done button disabled during countdown
- After countdown: Done button enabled
- After Done: "Latest computed" shows value like "143 minutes"

**In Console.app:**
```
🚀 Extension makeConfiguration called at <timestamp>
✓ App Group accessible: <path>
📋 Request loaded: date=2025-12-20 timezone=America/New_York
📊 Computed duration: 143 minutes (8580 seconds)
✓ Snapshot saved to UserDefaults: 143 minutes for 2025-12-20
✓ Snapshot file written to: <path>/dd_snapshot.json
✅ Extension completed in 0.23 seconds
```

**Host App Debug Output (Xcode console):**
```
DEBUG: Done button tapped
DEBUG: Refresh attempt 1/6
DEBUG: Extension invoked at <timestamp>: Extension makeConfiguration called
DEBUG: Extension completed at <timestamp>: Saved 143 minutes
DEBUG: ✓ Loaded snapshot from UserDefaults: 143 minutes for 2025-12-20
```

**Pass Criteria:**
- ✓ Countdown enforced (10 seconds)
- ✓ Done button disabled during countdown
- ✓ Extension logs appear in Console.app
- ✓ Snapshot successfully read on first attempt
- ✓ "Latest computed" shows non-zero minutes
- ✓ No error messages

**If Failed:**
- No extension logs → Provisioning issue, run Test 1
- Extension logs show error → Check error message, follow diagnostics doc
- Snapshot not found → Check retry attempts in Xcode console (should retry up to 6 times)

---

### Test 7: Retry Logic on Slow Extension

**Objective:** Verify host app retries reading snapshot if extension is slow

**Setup:**
This test simulates slow extension by dismissing sheet early (before extension completes).

**Steps:**
1. Tap **Compute yesterday minutes**
2. Wait only 3 seconds (before countdown finishes)
3. Force-dismiss sheet by swiping down (if possible) OR wait for countdown
4. Tap Done immediately
5. Observe Xcode console for retry attempts

**Expected Result:**

**Xcode Console:**
```
DEBUG: Done button tapped
DEBUG: Refresh attempt 1/6
DEBUG: No snapshot found on attempt 1
DEBUG: Refresh attempt 2/6
DEBUG: No snapshot found on attempt 2
DEBUG: Refresh attempt 3/6
DEBUG: ✓ Loaded snapshot from UserDefaults: 143 minutes for 2025-12-20
```

**Pass Criteria:**
- ✓ Host app retries up to 6 times (or until success)
- ✓ Waits 0.5 seconds between retries
- ✓ Eventually succeeds if extension completes within ~3 seconds

**If Failed:**
- Only 1 attempt → Retry logic broken
- All 6 attempts fail → Extension not running or snapshot not written

---

### Test 8: Fallback to File Snapshot

**Objective:** Verify file fallback if UserDefaults fails

**Note:** This is difficult to test without code modification. File fallback is automatic and redundant.

**Verification:**
Check Console.app logs for:
```
✓ Snapshot file written to: <path>/dd_snapshot.json
```

**Pass Criteria:**
- Extension writes to BOTH UserDefaults and file
- Host app can read from either source (prioritizes UserDefaults)

---

### Test 9: Upload Yesterday to Backend

**Objective:** Verify computed data uploads to web backend

**Pre-requisite:**
- Test 6 passed (snapshot computed)
- Valid credentials entered in Setup tab

**Steps:**
1. Navigate to **Yesterday** tab
2. Verify "Latest computed" shows minutes
3. Tap **Upload yesterday**
4. Wait for response (2-5 seconds)
5. Observe upload result line

**Expected Result:**
```
Uploaded 2025-12-20: status=match delta=null
```
(or similar, depending on backend response)

**Pass Criteria:**
- ✓ Upload succeeds (HTTP 200)
- ✓ Result line shows date and status
- ✓ No error messages

**If Failed:**
- HTTP error → Check credentials, backend URL, network
- "No minutes computed yet" → Run Test 6 first

---

### Test 10: Diagnostics After Successful Compute

**Objective:** Verify diagnostics show populated keys after compute

**Pre-requisite:**
- Test 6 passed

**Steps:**
1. Navigate to **Diagnostics** tab
2. Tap **Refresh Snapshot Dump**
3. Observe output

**Expected Result:**
```
✓ Container URL: <path>
✓ UserDefaults: accessible
  ✓ dd.screentime.request.v1: present
  ✓ dd.screentime.snapshot.v1: present
  ✓ dd_ext_invoked_ts: present
  ✓ dd_ext_completed_ts: present
  ✓ dd_ext_invoked_note: present
  ✓ dd_ext_completed_note: present
  - dd_ext_last_error: nil
  Extension invoked: <date>
  Extension completed: <date>
```

**Pass Criteria:**
- ✓ All snapshot-related keys show "present"
- ✓ Timestamps show recent dates
- ✓ No error key present

---

### Test 11: Error Handling - No Selection

**Objective:** Verify clear error when no apps selected

**Setup:**
Clear selection (or fresh install before selection)

**Steps:**
1. Navigate to **Yesterday** tab
2. Tap **Compute yesterday minutes**

**Expected Result:**
Error message appears:
```
Selection is empty; choose apps/categories first
```
Compute button does nothing (or error shown)

**Pass Criteria:**
- ✓ Clear error message
- ✓ Sheet does not appear
- ✓ User guided to fix (select apps)

---

### Test 12: Error Handling - App Group Unavailable

**Objective:** Verify clear warning if App Group fails at runtime

**Setup:**
This test requires intentionally breaking App Group (e.g., uninstall and reinstall without proper provisioning).

**Steps:**
1. Navigate to **Yesterday** tab
2. Look for warning banner

**Expected Result:**
If App Group container is nil:
```
⚠️ Shared container unavailable
This is usually an App Group provisioning issue. Check Diagnostics → App Group Self-Test for details.
```

**Pass Criteria:**
- ✓ Banner appears when container is unavailable
- ✓ Guidance directs user to Diagnostics
- ✓ User can self-diagnose issue

---

## Regression Tests

Run these to ensure no functionality broke:

### R1: Credentials Persistence
1. Enter access token and base URL in Setup tab
2. Tap Save
3. Force-quit app
4. Relaunch
5. Verify credentials still present

**Pass:** Credentials persist across app restarts

### R2: Selection Persistence
1. Select apps in Selection tab
2. Save selection
3. Force-quit app
4. Relaunch
5. Verify selection summary shows counts

**Pass:** Selection persists across restarts

### R3: Timezone Sync
1. Tap "Use device timezone" in Setup tab
2. Verify timezone ID matches device (e.g., "America/New_York")
3. Sync to backend
4. Verify backend receives correct timezone

**Pass:** Timezone correctly detected and synced

---

## Performance Tests

### P1: Extension Execution Time

**Objective:** Verify extension completes in reasonable time

**Measure:** Check Console.app log:
```
✅ Extension completed in 0.23 seconds
```

**Acceptable Range:** 0.1 - 3.0 seconds

**Pass Criteria:**
- ✓ Extension completes within 3 seconds
- ✓ No timeouts or hangs

### P2: Host App Retry Overhead

**Objective:** Verify retry logic doesn't cause excessive delay

**Measure:** Time from Done tap to snapshot loaded

**Expected:**
- Success on attempt 1: ~0.1 seconds
- Success on attempt 3: ~1.5 seconds
- All 6 attempts fail: ~3 seconds

**Pass Criteria:**
- ✓ No noticeable UI freeze
- ✓ User sees result within 3 seconds max

---

## Edge Cases

### E1: First-Time User Flow
1. Fresh install
2. No credentials, no selection, no permission
3. Walk through Setup → Request permission → Select apps → Sync → Compute
4. All steps should succeed with clear guidance

### E2: Zero Minutes Result
1. Select apps user didn't use yesterday
2. Compute
3. Should show "0 minutes" (valid result, not error)

### E3: Date Boundary at Midnight
1. Test at 11:59 PM
2. Verify "yesterday" date is correct
3. Test at 12:01 AM
4. Verify "yesterday" date updated

### E4: Airplane Mode
1. Enable airplane mode
2. Compute (should work - extension is local)
3. Upload (should fail with clear network error)

---

## Summary Checklist

Before considering feature complete, verify:

- [ ] Test 1: Entitlement script PASS
- [ ] Test 2: In-app diagnostics all ✓
- [ ] Test 3: Screen Time permission approved
- [ ] Test 4: Selection persists and syncs
- [ ] Test 5: Snapshot dump accessible
- [ ] Test 6: Compute succeeds with countdown
- [ ] Test 7: Retry logic works
- [ ] Test 9: Upload succeeds
- [ ] Test 10: Diagnostics show populated keys
- [ ] Test 11: Clear error on no selection
- [ ] Test 12: Clear warning on App Group failure
- [ ] R1-R3: Regression tests pass
- [ ] P1-P2: Performance acceptable
- [ ] E1-E4: Edge cases handled

## Test Execution Record

**Date:** _________________

**Tester:** _________________

**Device:** _________________ (model + iOS version)

**Build:** _________________ (commit hash or build number)

**Results:**

| Test ID | Status | Notes |
|---------|--------|-------|
| Test 1  | ☐ PASS ☐ FAIL | |
| Test 2  | ☐ PASS ☐ FAIL | |
| Test 3  | ☐ PASS ☐ FAIL | |
| Test 4  | ☐ PASS ☐ FAIL | |
| Test 5  | ☐ PASS ☐ FAIL | |
| Test 6  | ☐ PASS ☐ FAIL | |
| Test 7  | ☐ PASS ☐ FAIL | |
| Test 9  | ☐ PASS ☐ FAIL | |
| Test 10 | ☐ PASS ☐ FAIL | |
| Test 11 | ☐ PASS ☐ FAIL | |
| Test 12 | ☐ PASS ☐ FAIL | |
| R1      | ☐ PASS ☐ FAIL | |
| R2      | ☐ PASS ☐ FAIL | |
| R3      | ☐ PASS ☐ FAIL | |
| P1      | ☐ PASS ☐ FAIL | |
| P2      | ☐ PASS ☐ FAIL | |

**Overall:** ☐ All tests passed ☐ Some failures

**Next Steps:** _________________

