# Screen Time Read-Only Monitor Implementation

## Architecture Overview

This iOS companion app implements a **read-only Screen Time monitor** for Discipline Dungeon that calculates "Verified Minutes" (total time spent on productive apps yesterday) and bridges that data from the sandboxed Extension to the Main App via App Groups.

## Critical Architectural Constraints

### 1. The Privacy Gap
The Main App **CANNOT** read `DeviceActivity` data directly due to Apple's privacy restrictions. All Screen Time calculations must occur inside the `DeviceActivityReportExtension`.

### 2. The Data Bridge
The Extension calculates total minutes and writes the result to:
```swift
UserDefaults(suiteName: "group.com.disciplinedungeon.shared")
```

### 3. The Trigger Mechanism
The Main App renders a `DeviceActivityReport` view (in a modal sheet) to force the Extension to run and update the UserDefaults. The user must keep this sheet open for 5-10 seconds to allow the Extension to complete its calculations.

### 4. Target Membership
- **Extension Target**: `TotalActivityReport.swift`, `ScreenTimeReportExtension.swift`
- **Main App Target**: `ContentView.swift`, `CompanionModel.swift`, `Stores.swift`, `ApiClient.swift`, `BackendModels.swift`

## Implementation Details

### Extension: TotalActivityReport.swift

**Location**: `ios-companion/ScreenTimeReportExtension/TotalActivityReport.swift`

**Key Features**:
1. Defines `DeviceActivityReportScene` with context `.totalActivity`
2. Implements `makeConfiguration` to sum `totalActivityDuration` for yesterday's `.daily` interval
3. Writes debugging timestamps to App Group UserDefaults
4. Saves the final result as `ScreenTimeSnapshot` to key `dd.screentime.snapshot.v1`

**Data Flow**:
```swift
func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> ActivityReport {
    // 1. Write debug marker
    defaults?.set(Date().timeIntervalSince1970, forKey: "dd_ext_invoked_ts")

    // 2. Sum all activity durations
    var totalDuration: TimeInterval = 0
    for await activity in data {
        for await segment in activity.activitySegments {
            totalDuration += segment.totalActivityDuration
        }
    }

    // 3. Convert to minutes
    let minutes = max(0, Int(totalDuration / 60))

    // 4. Load computation request (date/timezone)
    let req = ScreenTimeComputationRequestStore.load()

    // 5. Save snapshot to App Group
    let snapshot = ScreenTimeSnapshot(
        date: req?.date ?? "unknown",
        timezone: req?.timezone ?? "unknown",
        verifiedMinutes: minutes,
        computedAt: Date()
    )
    ScreenTimeSnapshotStore.save(snapshot)

    return ActivityReport(totalMinutes: minutes)
}
```

### Main App: ContentView.swift

**Location**: `ios-companion/DisciplineDungeonIOSCompanion/ContentView.swift`

**UI Structure**: Three tabs
1. **Setup Tab**: Configure Supabase credentials, request Screen Time permission, set timezone
2. **Selection Tab**: `FamilyActivityPicker` for choosing productive apps/categories
3. **Yesterday Tab**: Compute and upload verified minutes

**Yesterday Tab Workflow**:
1. User taps "Compute yesterday minutes"
2. App stages a `ScreenTimeComputationRequest` in App Group UserDefaults
3. Modal sheet opens with `DeviceActivityReport(.totalActivity, filter: yesterdayFilter)`
4. Extension runs asynchronously, computes minutes, writes to App Group
5. User closes sheet after 5-10 seconds
6. App reads `ScreenTimeSnapshot` from App Group and displays result
7. User taps "Upload yesterday" to POST to backend API

### Main App: CompanionModel.swift

**Location**: `ios-companion/DisciplineDungeonIOSCompanion/CompanionModel.swift`

**Key Methods**:

```swift
// Writes computation request to App Group before triggering Extension
func stageComputationRequest() {
    let req = ScreenTimeComputationRequest(date: yesterdayDateString, timezone: timezoneId)
    // Saves to "dd.screentime.request.v1"
}

// Reads snapshot from App Group after Extension completes
func refreshComputedValue() {
    if let snapshot = ScreenTimeSnapshotStore.load() {
        lastComputedMinutes = snapshot.verifiedMinutes
    }
}

// Creates DeviceActivityFilter for yesterday's date interval
func makeYesterdayFilter() -> DeviceActivityFilter? {
    let interval = LocalDay.yesterdayDateInterval(timeZoneId: timezoneId)

    return DeviceActivityFilter(
        segment: .daily(during: interval),
        applications: selection.applicationTokens,
        categories: selection.categoryTokens,
        webDomains: selection.webDomainTokens
    )
}

// Uploads verified minutes to backend
func uploadYesterday() async {
    let url = try ApiClient.endpointURL(
        baseURLString: creds.baseURLString,
        path: "/api/verification/ios/upload"
    )
    let body = IosUploadBody(
        date: yesterdayDateString,
        verifiedMinutes: lastComputedMinutes,
        raw: IosUploadRawPayload(...)
    )
    let res = try await ApiClient.post(url: url, accessToken: creds.accessToken, body: body)
}
```

### Shared Data: Stores.swift

**Location**: `ios-companion/DisciplineDungeonIOSCompanion/Stores.swift`

**App Group Configuration**:
```swift
enum AppGroup {
    static let identifier = "group.com.disciplinedungeon.shared"
    static var defaults: UserDefaults {
        UserDefaults(suiteName: identifier) ?? .standard
    }
}
```

**Data Stores**:
- `SelectionStore`: Persists `FamilyActivitySelection` as PropertyList in App Group
- `ScreenTimeComputationRequestStore`: Request payload for Extension (date, timezone)
- `ScreenTimeSnapshotStore`: Result from Extension (date, timezone, verifiedMinutes, computedAt)
- `CredentialsStore`: Supabase token and base URL (stored in standard UserDefaults, not App Group)

## Configuration Requirements

### Entitlements (Both Targets)

**Main App**: `DisciplineDungeonIOSCompanion.entitlements`
```xml
<dict>
    <key>com.apple.developer.family-controls</key>
    <true/>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.disciplinedungeon.shared</string>
    </array>
</dict>
```

**Extension**: `ScreenTimeReportExtension.entitlements`
```xml
<dict>
    <key>com.apple.developer.family-controls</key>
    <true/>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.disciplinedungeon.shared</string>
    </array>
</dict>
```

### Info.plist Keys

**Main App**: `DisciplineDungeonIOSCompanion/Info.plist`
```xml
<key>NSFamilyControlsUsageDescription</key>
<string>Discipline Dungeon uses Screen Time to verify your selected apps/categories for "yesterday".</string>
```

**Extension**: `ScreenTimeReportExtension/Info.plist`
```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.deviceactivityreport-extension</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).ScreenTimeReportExtension</string>
</dict>
```

## API Schema

### Upload Verified Minutes

**Endpoint**: `POST /api/verification/ios/upload`

**Headers**:
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "date": "YYYY-MM-DD",
  "verifiedMinutes": 120,
  "raw": {
    "source": "ios_deviceactivity_v2",
    "timezone": "America/New_York",
    "selection": {
      "v": 1,
      "encodedPlistBase64": "...",
      "applicationTokenCount": 5,
      "categoryTokenCount": 2,
      "webDomainTokenCount": 0
    },
    "computedAtISO8601": "2025-12-18T10:30:00Z"
  }
}
```

**Response**:
```json
{
  "date": "2025-12-17",
  "status": "created",
  "deltaMinutes": 120
}
```

### Sync Connection Settings

**Endpoint**: `PATCH /api/verification/ios/connection`

**Request Body**:
```json
{
  "enabled": true,
  "timezone": "America/New_York",
  "selection": {
    "v": 1,
    "encodedPlistBase64": "...",
    "applicationTokenCount": 5,
    "categoryTokenCount": 2,
    "webDomainTokenCount": 0
  }
}
```

## User Workflow

### First-Time Setup
1. Open app → Setup tab
2. Enter Supabase access token and base URL
3. Tap "Save"
4. Tap "Request Screen Time access" → approve system dialog
5. Configure timezone (or use device timezone)

### Configure Productive Apps
1. Open app → Selection tab
2. Use `FamilyActivityPicker` to select apps/categories
3. Tap "Save selection locally"
4. Tap "Sync selection + timezone to backend"

### Daily Verification (Every Morning)
1. Open app → Yesterday tab
2. Verify target date shows yesterday
3. Tap "Compute yesterday minutes"
4. Wait 5-10 seconds in the modal sheet
5. Tap "Done"
6. Verify computed minutes display
7. Tap "Upload yesterday"
8. Confirm success message

## Debugging Tips

### Check Extension Execution
```swift
let defaults = UserDefaults(suiteName: "group.com.disciplinedungeon.shared")
let invokedTime = defaults?.double(forKey: "dd_ext_invoked_ts")
let completedTime = defaults?.double(forKey: "dd_ext_completed_ts")
print("Extension last invoked: \(Date(timeIntervalSince1970: invokedTime))")
print("Extension last completed: \(Date(timeIntervalSince1970: completedTime))")
```

### Verify App Group Data
```swift
let snapshot = ScreenTimeSnapshotStore.load()
print("Snapshot: \(snapshot?.verifiedMinutes ?? 0) minutes on \(snapshot?.date ?? "nil")")

let request = ScreenTimeComputationRequestStore.load()
print("Request: \(request?.date ?? "nil") in \(request?.timezone ?? "nil")")
```

### Common Issues
1. **Extension doesn't run**: Keep modal sheet open longer (10-15 seconds)
2. **Zero minutes returned**: Check that apps/categories were actually used yesterday
3. **App Group not working**: Verify entitlements include exact group ID in both targets
4. **Permission denied**: Re-request authorization in Settings → Screen Time → Share Across Devices

## File Structure

```
ios-companion/
├── DisciplineDungeonIOSCompanion/          (Main App Target)
│   ├── DisciplineDungeonIOSCompanion.entitlements
│   ├── Info.plist
│   ├── DisciplineDungeonIOSCompanionApp.swift
│   ├── ContentView.swift                   (UI with 3 tabs)
│   ├── CompanionModel.swift                (Business logic)
│   ├── Stores.swift                        (App Group UserDefaults)
│   ├── ApiClient.swift                     (HTTP client)
│   ├── BackendModels.swift                 (API DTOs)
│   ├── LocalDay.swift                      (Date utilities)
│   └── ScreenTimeReducer.swift             (Reducer logic)
│
└── ScreenTimeReportExtension/              (Extension Target)
    ├── ScreenTimeReportExtension.entitlements
    ├── Info.plist
    ├── ScreenTimeReportExtension.swift     (Extension entry point)
    └── TotalActivityReport.swift           (DeviceActivityReportScene)
```

## Key Takeaways

1. **Privacy by Design**: Apple's sandbox prevents direct Screen Time access from the main app
2. **Asynchronous Computation**: Extension runs on a background thread; requires user to wait
3. **App Groups are Essential**: Only way to share data between app and extension
4. **User Authorization Required**: Must request `FamilyControls` authorization before any Screen Time access
5. **Date/Timezone Handling**: Extension needs timezone to correctly filter yesterday's interval
6. **Selection Encoding**: `FamilyActivitySelection` can only be encoded as PropertyList, not JSON

## Testing Checklist

- [ ] Screen Time authorization granted
- [ ] App Group entitlements configured for both targets
- [ ] At least one app/category selected
- [ ] Timezone configured correctly
- [ ] Extension executes and writes debug timestamps
- [ ] Snapshot appears in App Group UserDefaults after computation
- [ ] Verified minutes display in UI
- [ ] Backend upload succeeds with 200 OK
- [ ] Delta minutes calculated correctly on server
