import DeviceActivity
import FamilyControls
import Foundation

@MainActor
final class CompanionModel: ObservableObject {
  @Published var baseURLString: String = ""
  @Published var timezoneId: String = TimeZone.current.identifier

  @Published var selection: FamilyActivitySelection = SelectionStore.load()
  @Published var dailyCapMinutes: Int = 30
  @Published var enforcementEnabled: Bool = false

  @Published private(set) var authorizationStatusDescription: String = "unknown"
  @Published private(set) var lastStatusLine: String?
  @Published private(set) var lastUploadResultLine: String?
  @Published private(set) var lastEnforcementSyncLine: String?

  @Published private(set) var lastComputedMinutes: Int?
  @Published private(set) var computeError: String?
  @Published private(set) var isComputing: Bool = false
  @Published private(set) var lastComputeResultLine: String?
  @Published private(set) var enforcementStatus: String = "UNVERIFIED"
  @Published private(set) var enforcementDetail: String?
  @Published private(set) var lastMonitorRunAt: Date?
  @Published private(set) var thresholdHitAt: Date?
  @Published private(set) var expectedPlanHash: String?
  @Published private(set) var activePlanHash: String?
  @Published private(set) var monitoringActive: Bool = false

  let authManager: SupabaseAuthManager

  // Helper computed property for SwiftUI bindings
  var isAuthenticated: Bool {
    authManager.isAuthenticated
  }

  init(authManager: SupabaseAuthManager) {
    self.authManager = authManager

    // Load base URL from settings (migrate old credentials if needed)
    if let migratedURL = CredentialsStore.migrate() {
      self.baseURLString = migratedURL
    } else if let settings = BackendSettingsStore.load() {
      self.baseURLString = settings.baseURL
    }

    #if ENFORCEMENT_ENABLED
    if let plan = EnforcementPlanStore.load() {
      self.dailyCapMinutes = max(1, plan.dailyCapMinutes)
      self.enforcementEnabled = plan.enabled
      self.timezoneId = plan.timezoneId
    }
    #else
    self.enforcementEnabled = false
    self.enforcementStatus = "DISABLED"
    self.enforcementDetail = "Enforcement not enabled in this build"
    #endif
  }

  // Update API client when base URL changes
  func updateApiClient() {
    let trimmed = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }
    if trimmed != baseURLString {
      baseURLString = trimmed
    }
    BackendSettingsStore.save(BackendSettings(baseURL: trimmed))
  }

  var selectionSummary: String {
    "Apps: \(selection.applicationTokens.count) • Categories: \(selection.categoryTokens.count) • Web: \(selection.webDomainTokens.count)"
  }

  var yesterdayDateString: String {
    LocalDay.yesterdayDateString(timeZoneId: timezoneId)
  }

  var canCompute: Bool {
    computeError = nil
    if let message = computePrerequisiteMessage() {
      computeError = message
      return false
    }
    return true
  }

  func refreshAuthorizationStatus() async {
    let status = AuthorizationCenter.shared.authorizationStatus
    switch status {
    case .approved:
      authorizationStatusDescription = "approved"
    case .denied:
      authorizationStatusDescription = "denied"
    case .notDetermined:
      authorizationStatusDescription = "notDetermined"
    @unknown default:
      authorizationStatusDescription = "unknown"
    }
  }

  func requestScreenTimeAuthorization() async {
    do {
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      await refreshAuthorizationStatus()
      lastStatusLine = "Screen Time authorization requested."
    } catch {
      lastStatusLine = "Authorization failed: \(error.localizedDescription)"
    }
  }

  func saveBaseURL() {
    updateApiClient()
    lastStatusLine = "Base URL saved."
  }

  func persistSelection() {
    SelectionStore.save(selection)
    lastStatusLine = "Selection saved."
  }

  func applyEnforcementPlan() {
    guard FeatureFlags.enforcementEnabled else {
      enforcementEnabled = false
      enforcementStatus = "DISABLED"
      enforcementDetail = "Enforcement not enabled in this build"
      lastStatusLine = "Enforcement not enabled in this build."
      return
    }

    #if ENFORCEMENT_ENABLED
    if enforcementEnabled {
      if let message = enforcementPrerequisiteMessage() {
        enforcementEnabled = false
        let plan = EnforcementPlan(
          enabled: false,
          dailyCapMinutes: max(1, dailyCapMinutes),
          timezoneId: timezoneId,
          updatedAt: Date()
        )
        SelectionStore.save(selection)
        EnforcementPlanStore.save(plan)

        let planHash = EnforcementPlanHasher.hash(
          selection: selection,
          dailyCapMinutes: plan.dailyCapMinutes,
          timezoneId: plan.timezoneId
        )
        expectedPlanHash = planHash

        if let defaults = AppGroupDiagnostics.defaults() {
          defaults.set(planHash, forKey: ScreenTimeShared.Keys.enforcementPlanHash)
        }

        let planEvent = EnforcementEventFactory.make(
          type: .planUpdated,
          planHash: planHash.isEmpty ? nil : planHash,
          timezoneId: timezoneId,
          dailyCapMinutes: plan.dailyCapMinutes,
          note: "disabled: \(message)"
        )
        EnforcementEventLog.append(planEvent)

        lastStatusLine = "Enforcement not enabled: \(message)"
        stopMonitoring()
        refreshEnforcementStatus()
        return
      }
    }

    let plan = EnforcementPlan(
      enabled: enforcementEnabled,
      dailyCapMinutes: max(1, dailyCapMinutes),
      timezoneId: timezoneId,
      updatedAt: Date()
    )
    SelectionStore.save(selection)
    EnforcementPlanStore.save(plan)

    let planHash = EnforcementPlanHasher.hash(
      selection: selection,
      dailyCapMinutes: plan.dailyCapMinutes,
      timezoneId: plan.timezoneId
    )
    expectedPlanHash = planHash

    if let defaults = AppGroupDiagnostics.defaults() {
      defaults.set(planHash, forKey: ScreenTimeShared.Keys.enforcementPlanHash)
    }

    let planEvent = EnforcementEventFactory.make(
      type: .planUpdated,
      planHash: planHash.isEmpty ? nil : planHash,
      timezoneId: timezoneId,
      dailyCapMinutes: plan.dailyCapMinutes,
      note: enforcementEnabled ? "enabled" : "disabled"
    )
    EnforcementEventLog.append(planEvent)

    if enforcementEnabled {
      startMonitoring(planHash: planHash)
    } else {
      stopMonitoring()
    }

    refreshEnforcementStatus()
    #endif
  }

  func stageComputationRequest() {
    let date = LocalDay.yesterdayDateString(timeZoneId: timezoneId)
    let req = ScreenTimeComputationRequest(date: date, timezone: timezoneId)
    ScreenTimeComputationRequestStore.save(req)
  }

  func refreshComputedValue(reason: String = "manual") {
    computeError = nil
    if let message = computePrerequisiteMessage() {
      computeError = message
      print("INFO: compute blocked (\(reason)): \(message)")
      return
    }

    guard !isComputing else {
      print("INFO: compute already running (\(reason))")
      return
    }

    isComputing = true
    Task {
      defer { isComputing = false }
      await refreshComputedValueWithRetry()
    }
  }

  private func computePrerequisiteMessage() -> String? {
    if !authManager.hasValidSession {
      return "Not signed in. Sign in first."
    }

    let status = AuthorizationCenter.shared.authorizationStatus
    if status != .approved {
      return "Not authorized; request Screen Time access first"
    }

    if selection.applicationTokens.isEmpty &&
      selection.categoryTokens.isEmpty &&
      selection.webDomainTokens.isEmpty {
      return "Selection is empty; choose apps/categories first"
    }

    return nil
  }

  private func enforcementPrerequisiteMessage() -> String? {
    let status = AuthorizationCenter.shared.authorizationStatus
    if status != .approved {
      return "Screen Time authorization not approved"
    }

    if selection.applicationTokens.isEmpty &&
      selection.categoryTokens.isEmpty &&
      selection.webDomainTokens.isEmpty {
      return "Selection is empty"
    }

    if dailyCapMinutes < 1 {
      return "Daily cap must be >= 1 minute"
    }

    if TimeZone(identifier: timezoneId) == nil {
      return "Invalid timezone"
    }

    return nil
  }

  private func refreshComputedValueWithRetry() async {
    // Try to read snapshot with retry logic (up to 6 attempts over ~3 seconds)
    for attempt in 1...6 {
      print("DEBUG: Refresh attempt \(attempt)/6")

      let defaults = AppGroupDiagnostics.defaults()
      if defaults == nil {
        print("DEBUG: App Group UserDefaults unavailable (likely provisioning issue)")
      }

      // Debug logging
      let invokedTs = defaults?.double(forKey: ScreenTimeShared.Keys.extInvokedTs)
      let completedTs = defaults?.double(forKey: ScreenTimeShared.Keys.extCompletedTs)
      let invokedNote = defaults?.string(forKey: ScreenTimeShared.Keys.extInvokedNote)
      let completedNote = defaults?.string(forKey: ScreenTimeShared.Keys.extCompletedNote)

      print("DEBUG: Extension invoked at \(invokedTs ?? 0): \(invokedNote ?? "nil")")
      print("DEBUG: Extension completed at \(completedTs ?? 0): \(completedNote ?? "nil")")

      // Try UserDefaults first
      if let snapshot = ScreenTimeSnapshotStore.load() {
        lastComputedMinutes = snapshot.verifiedMinutes
        print("DEBUG: ✓ Loaded snapshot from UserDefaults: \(snapshot.verifiedMinutes) minutes for \(snapshot.date)")
        return
      }

      // Try file fallback
      if let containerURL = AppGroupDiagnostics.containerURL() {
        let snapshotFileURL = containerURL.appendingPathComponent(ScreenTimeShared.Files.snapshot)
        if let fileData = try? Data(contentsOf: snapshotFileURL),
           let snapshot = try? JSONDecoder().decode(ScreenTimeSnapshot.self, from: fileData) {
          lastComputedMinutes = snapshot.verifiedMinutes
          print("DEBUG: ✓ Loaded snapshot from file: \(snapshot.verifiedMinutes) minutes for \(snapshot.date)")
          return
        }
      }

      print("DEBUG: No snapshot found on attempt \(attempt)")

      // Wait before retry (except on last attempt)
      if attempt < 6 {
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
      }
    }

    // All attempts failed
    lastComputedMinutes = nil
    print("DEBUG: ❌ No snapshot found after 6 attempts (~3 seconds)")

    // Check for App Group issues
    if AppGroupDiagnostics.containerURL() == nil {
      print("DEBUG: ⚠️ App Group container unavailable - likely provisioning issue")
    }
  }

  func makeYesterdayFilter() -> DeviceActivityFilter? {
    guard TimeZone(identifier: timezoneId) != nil else { return nil }
    if selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty && selection.webDomainTokens.isEmpty {
      return nil
    }

    let interval = LocalDay.yesterdayDateInterval(timeZoneId: timezoneId)

    return DeviceActivityFilter(
      segment: .daily(during: interval),
      applications: selection.applicationTokens,
      categories: selection.categoryTokens,
      webDomains: selection.webDomainTokens
    )
  }

  func refreshEnforcementStatus() {
    if !FeatureFlags.enforcementEnabled {
      enforcementStatus = "DISABLED"
      enforcementDetail = "Enforcement not enabled in this build"
      monitoringActive = false
      return
    }

    #if ENFORCEMENT_ENABLED
    enforcementDetail = nil
    monitoringActive = DeviceActivityCenter().activities.contains(DDMonitorActivity.dailyCap)

    let status = AuthorizationCenter.shared.authorizationStatus
    if status != .approved {
      enforcementStatus = "UNVERIFIED"
      enforcementDetail = "Authorization not approved"
      return
    }

    guard enforcementEnabled else {
      enforcementStatus = "UNVERIFIED"
      enforcementDetail = "Enforcement disabled"
      return
    }

    if selection.applicationTokens.isEmpty &&
      selection.categoryTokens.isEmpty &&
      selection.webDomainTokens.isEmpty {
      enforcementStatus = "UNVERIFIED"
      enforcementDetail = "Selection empty"
      return
    }

    if dailyCapMinutes < 1 {
      enforcementStatus = "UNVERIFIED"
      enforcementDetail = "Daily cap invalid"
      return
    }

    guard let defaults = AppGroupDiagnostics.defaults() else {
      enforcementStatus = "UNVERIFIED"
      enforcementDetail = "App Group unavailable"
      return
    }

    let lastMonitorRunTs = defaults.double(forKey: ScreenTimeShared.Keys.enforcementLastMonitorRunTs)
    let thresholdHitTs = defaults.double(forKey: ScreenTimeShared.Keys.enforcementThresholdHitTs)
    let storedActiveHash = defaults.string(forKey: ScreenTimeShared.Keys.enforcementActivePlanHash)
    let storedExpectedHash = defaults.string(forKey: ScreenTimeShared.Keys.enforcementPlanHash)

    lastMonitorRunAt = lastMonitorRunTs > 0 ? Date(timeIntervalSince1970: lastMonitorRunTs) : nil
    thresholdHitAt = thresholdHitTs > 0 ? Date(timeIntervalSince1970: thresholdHitTs) : nil
    activePlanHash = storedActiveHash
    expectedPlanHash = storedExpectedHash

    if let lastMonitorRunAt {
      let staleness = Date().timeIntervalSince(lastMonitorRunAt)
      if staleness > 36 * 60 * 60 {
        enforcementStatus = "UNVERIFIED"
        enforcementDetail = "Monitor heartbeat stale"
        return
      }
    } else {
      enforcementStatus = "UNVERIFIED"
      enforcementDetail = "No monitor heartbeat"
      return
    }

    if let storedExpectedHash, let storedActiveHash, !storedExpectedHash.isEmpty,
       storedExpectedHash != storedActiveHash {
      enforcementStatus = "UNVERIFIED"
      enforcementDetail = "Active plan hash mismatch"
      return
    }

    if let thresholdHitAt,
       LocalDay.isSameDay(thresholdHitAt, Date(), timeZoneId: timezoneId) {
      enforcementStatus = "VIOLATED"
      enforcementDetail = "Threshold reached today"
      return
    }

    enforcementStatus = "COMPLIANT"
    #endif
  }

  func syncConnectionToBackend() async {
    let trimmedBaseURL = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedBaseURL.isEmpty else {
      lastStatusLine = "Missing base URL. Set it in Setup tab first."
      return
    }

    guard authManager.isAuthenticated else {
      lastStatusLine = "Not signed in. Sign in first."
      return
    }

    guard TimeZone(identifier: timezoneId) != nil else {
      lastStatusLine = "Invalid timezone."
      return
    }

    do {
      let selectionPayload = SelectionStore.selectionPayload(forServerIfAvailable: selection)
      let body = IosConnectionPatchBody(enabled: true, timezone: timezoneId, selection: selectionPayload)

      let url = try ApiClient.endpointURL(
        baseURLString: trimmedBaseURL,
        path: "/api/verification/ios/connection"
      )
      let accessToken = try await authManager.getAccessToken()
      let response: IosConnectionGetResponse = try await ApiClient.patch(
        url: url,
        accessToken: accessToken,
        body: body
      )
      lastStatusLine = "Synced connection: enabled=\(response.enabled) tz=\(response.timezone)"
    } catch let error as AuthError {
      lastStatusLine = "Sync failed: \(error.localizedDescription)"
    } catch let error as ApiClientError {
      switch error {
      case .invalidBaseURL:
        lastStatusLine = "Sync failed: Invalid base URL '\(baseURLString)'"
      case .invalidResponse:
        lastStatusLine = "Sync failed: Invalid response from server"
      case .httpError(let status, let body):
        lastStatusLine = "Sync failed: HTTP \(status) - \(body ?? "no body")"
      }
    } catch {
      lastStatusLine = "Sync failed: \(error.localizedDescription)"
    }
  }

  func requestComputeYesterday() {
    lastComputeResultLine = "Computing... keep this screen open for 5-10 seconds"

    // Check prerequisites
    if let prereqMsg = computePrerequisiteMessage() {
      lastComputeResultLine = prereqMsg
      return
    }

    // Stage computation request
    let date = LocalDay.yesterdayDateString(timeZoneId: timezoneId)
    let req = ScreenTimeComputationRequest(date: date, timezone: timezoneId)
    ScreenTimeComputationRequestStore.save(req)

    // Trigger report computation in background
    Task {
      isComputing = true
      lastComputeResultLine = "Extension computing... please wait"

      // Wait for computation
      await refreshComputedValueWithRetry()

      isComputing = false
      if let minutes = lastComputedMinutes {
        lastComputeResultLine = "✓ Computed \(minutes) minutes for \(date)"
      } else {
        lastComputeResultLine = "Failed to compute. Try again or check Diagnostics."
      }
    }
  }

  func uploadYesterday() async {
    let trimmedBaseURL = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedBaseURL.isEmpty else {
      lastUploadResultLine = "Missing base URL. Set it in Setup tab first."
      return
    }

    guard authManager.isAuthenticated else {
      lastUploadResultLine = "Not signed in. Sign in first."
      return
    }

    guard let verifiedMinutes = lastComputedMinutes else {
      lastUploadResultLine = "No minutes computed yet. Compute first."
      return
    }

    let date = LocalDay.yesterdayDateString(timeZoneId: timezoneId)

    do {
      let raw = IosUploadRawPayload(
        source: "ios_deviceactivity_v2",
        timezone: timezoneId,
        selection: SelectionStore.selectionPayload(forServerIfAvailable: selection),
        computedAtISO8601: ISO8601DateFormatter().string(from: Date())
      )
      let body = IosUploadBody(date: date, verifiedMinutes: verifiedMinutes, raw: raw)

      let url = try ApiClient.endpointURL(
        baseURLString: trimmedBaseURL,
        path: "/api/verification/ios/upload"
      )
      let accessToken = try await authManager.getAccessToken()
      let res: IosUploadResponse = try await ApiClient.post(
        url: url,
        accessToken: accessToken,
        body: body,
        responseType: IosUploadResponse.self
      )
      lastUploadResultLine = "Uploaded \(res.date): status=\(res.status) delta=\(res.deltaMinutes?.description ?? "null")"
    } catch let error as AuthError {
      lastUploadResultLine = "Upload failed: \(error.localizedDescription)"
    } catch let error as ApiClientError {
      switch error {
      case .invalidBaseURL:
        lastUploadResultLine = "Upload failed: Invalid base URL '\(baseURLString)'"
      case .invalidResponse:
        lastUploadResultLine = "Upload failed: Invalid response from server"
      case .httpError(let status, let body):
        lastUploadResultLine = "Upload failed: HTTP \(status) - \(body ?? "no body")"
      }
    } catch {
      lastUploadResultLine = "Upload failed: \(error.localizedDescription)"
    }
  }

  func syncEnforcementEvents() async {
    guard FeatureFlags.enforcementEnabled else {
      lastEnforcementSyncLine = "Enforcement not enabled in this build."
      return
    }

    #if ENFORCEMENT_ENABLED
    lastEnforcementSyncLine = nil
    let trimmedBaseURL = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedBaseURL.isEmpty else {
      lastEnforcementSyncLine = "Missing base URL. Set it in Setup tab first."
      return
    }

    guard authManager.isAuthenticated else {
      lastEnforcementSyncLine = "Not signed in. Sign in first."
      return
    }

    let events = EnforcementEventLog.loadAll()
    if events.isEmpty {
      lastEnforcementSyncLine = "No enforcement events to sync."
      return
    }

    let formatter = ISO8601DateFormatter()
    let payloads = events.map { event in
      IosEnforcementEventPayload(
        dedupeKey: event.id,
        type: event.type.rawValue,
        eventTs: formatter.string(from: event.timestamp),
        planHash: event.planHash,
        timezone: event.timezoneId,
        dailyCapMinutes: event.dailyCapMinutes,
        note: event.note
      )
    }

    do {
      let body = IosEnforcementEventsBody(events: payloads)
      let url = try ApiClient.endpointURL(
        baseURLString: trimmedBaseURL,
        path: "/api/verification/ios/enforcement-events"
      )
      let accessToken = try await authManager.getAccessToken()
      let response: IosEnforcementEventsResponse = try await ApiClient.post(
        url: url,
        accessToken: accessToken,
        body: body,
        responseType: IosEnforcementEventsResponse.self
      )

      if let defaults = AppGroupDiagnostics.defaults() {
        defaults.set(Date().timeIntervalSince1970, forKey: ScreenTimeShared.Keys.enforcementLastSyncTs)
      }

      lastEnforcementSyncLine = "Synced events: stored \(response.stored) of \(response.received)"
    } catch let error as AuthError {
      lastEnforcementSyncLine = "Sync failed: \(error.localizedDescription)"
    } catch let error as ApiClientError {
      switch error {
      case .invalidBaseURL:
        lastEnforcementSyncLine = "Sync failed: Invalid base URL '\(baseURLString)'"
      case .invalidResponse:
        lastEnforcementSyncLine = "Sync failed: Invalid response from server"
      case .httpError(let status, let body):
        lastEnforcementSyncLine = "Sync failed: HTTP \(status) - \(body ?? "no body")"
      }
    } catch {
      lastEnforcementSyncLine = "Sync failed: \(error.localizedDescription)"
    }
    #endif
  }

  #if ENFORCEMENT_ENABLED
  private func startMonitoring(planHash: String) {
    let schedule = DeviceActivitySchedule(
      intervalStart: DateComponents(hour: 0, minute: 0),
      intervalEnd: DateComponents(hour: 23, minute: 59),
      repeats: true
    )

    let event = DeviceActivityEvent(
      applications: selection.applicationTokens,
      categories: selection.categoryTokens,
      webDomains: selection.webDomainTokens,
      threshold: DateComponents(minute: dailyCapMinutes)
    )

    do {
      try DeviceActivityCenter().startMonitoring(
        DDMonitorActivity.dailyCap,
        during: schedule,
        events: [DDMonitorActivity.threshold: event]
      )

      if let defaults = AppGroupDiagnostics.defaults() {
        defaults.removeObject(forKey: ScreenTimeShared.Keys.enforcementLastError)
      }

      let started = EnforcementEventFactory.make(
        type: .monitorStarted,
        planHash: planHash.isEmpty ? nil : planHash,
        timezoneId: timezoneId,
        dailyCapMinutes: dailyCapMinutes,
        note: "startMonitoring"
      )
      EnforcementEventLog.append(started)

      lastStatusLine = "Enforcement monitoring started."
    } catch {
      if let defaults = AppGroupDiagnostics.defaults() {
        defaults.set(error.localizedDescription, forKey: ScreenTimeShared.Keys.enforcementLastError)
      }

      let failed = EnforcementEventFactory.make(
        type: .monitorError,
        planHash: planHash.isEmpty ? nil : planHash,
        timezoneId: timezoneId,
        dailyCapMinutes: dailyCapMinutes,
        note: "startMonitoring failed: \(error.localizedDescription)"
      )
      EnforcementEventLog.append(failed)

      lastStatusLine = "Failed to start monitoring: \(error.localizedDescription)"
    }
  }

  private func stopMonitoring() {
    DeviceActivityCenter().stopMonitoring([DDMonitorActivity.dailyCap])

    let stopped = EnforcementEventFactory.make(
      type: .monitorStopped,
      planHash: expectedPlanHash,
      timezoneId: timezoneId,
      dailyCapMinutes: dailyCapMinutes,
      note: "stopMonitoring"
    )
    EnforcementEventLog.append(stopped)

    lastStatusLine = "Enforcement monitoring stopped."
  }
  #endif

}
