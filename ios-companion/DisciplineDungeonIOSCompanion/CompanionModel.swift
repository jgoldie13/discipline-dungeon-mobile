import DeviceActivity
import FamilyControls
import Foundation

@MainActor
final class CompanionModel: ObservableObject {
  @Published var accessToken: String = ""
  @Published var baseURLString: String = ""
  @Published var timezoneId: String = TimeZone.current.identifier

  @Published var selection: FamilyActivitySelection = SelectionStore.load()

  @Published private(set) var authorizationStatusDescription: String = "unknown"
  @Published private(set) var lastStatusLine: String?
  @Published private(set) var lastUploadResultLine: String?

  @Published private(set) var lastComputedSnapshot: ScreenTimeSnapshot?
  @Published var manualVerifiedMinutesOverride: String = ""

  init() {
    let creds = CredentialsStore.load()
    self.accessToken = creds.accessToken
    self.baseURLString = creds.baseURLString
    refreshLastComputedSnapshot()
  }

  var selectionSummary: String {
    "Apps: \(selection.applicationTokens.count) • Categories: \(selection.categoryTokens.count) • Web: \(selection.webDomainTokens.count)"
  }

  var yesterdayDateString: String {
    LocalDay.yesterdayDateString(timeZoneId: timezoneId)
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

  func persistCredentials() {
    CredentialsStore.save(.init(accessToken: accessToken, baseURLString: baseURLString))
    lastStatusLine = "Saved."
  }

  func persistSelection() {
    SelectionStore.save(selection)
    lastStatusLine = "Selection saved."
  }

  func stageYesterdayComputationRequest() {
    let date = LocalDay.yesterdayDateString(timeZoneId: timezoneId)
    ScreenTimeComputationRequestStore.save(.init(date: date, timezone: timezoneId))
    lastStatusLine = "Staged computation for \(date)."
  }

  func refreshLastComputedSnapshot() {
    lastComputedSnapshot = ScreenTimeSnapshotStore.load()
  }

  func makeYesterdayFilter() -> DeviceActivityFilter? {
    guard TimeZone(identifier: timezoneId) != nil else { return nil }
    if selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty && selection.webDomainTokens.isEmpty {
      return nil
    }

    let interval = LocalDay.yesterdayDateInterval(timeZoneId: timezoneId)

    return DeviceActivityFilter(
      segment: .daily(during: interval),
      users: .all,
      devices: .all,
      applications: selection.applicationTokens,
      categories: selection.categoryTokens,
      webDomains: selection.webDomainTokens
    )
  }

  func syncConnectionToBackend() async {
    guard let request = makeConnectionRequest() else { return }
    do {
      let response: IosConnectionGetResponse = try await ApiClient.patch(
        url: request.url,
        accessToken: request.accessToken,
        body: request.body
      )
      lastStatusLine = "Synced connection: enabled=\(response.enabled) tz=\(response.timezone)"
    } catch {
      lastStatusLine = "Sync failed: \(error.localizedDescription)"
    }
  }

  func uploadYesterday() async {
    guard let creds = CredentialsStore.loadNonEmpty() else {
      lastUploadResultLine = "Missing base URL or access token."
      return
    }

    let date = LocalDay.yesterdayDateString(timeZoneId: timezoneId)
    let snap = ScreenTimeSnapshotStore.load()
    let minutesFromSnapshot = (snap?.date == date) ? snap?.verifiedMinutes : nil
    let minutesFromManual = Int(manualVerifiedMinutesOverride.trimmingCharacters(in: .whitespacesAndNewlines))

    let verifiedMinutes: Int
    if let m = minutesFromSnapshot {
      verifiedMinutes = m
    } else if let m = minutesFromManual, m >= 0 {
      verifiedMinutes = m
    } else {
      lastUploadResultLine = "No minutes for \(date). Compute first, or enter a manual fallback value."
      return
    }

    do {
      let url = try ApiClient.endpointURL(baseURLString: creds.baseURLString, path: "/api/verification/ios/upload")
      let raw = IosUploadRawPayload(
        source: "ios_deviceactivity_v1",
        timezone: timezoneId,
        selection: SelectionStore.selectionPayload(forServerIfAvailable: selection),
        computedAtISO8601: ISO8601DateFormatter().string(from: snap?.computedAt ?? Date())
      )
      let body = IosUploadBody(date: date, verifiedMinutes: verifiedMinutes, raw: raw)

      let res = try await ApiClient.post(
        url: url,
        accessToken: creds.accessToken,
        body: body,
        responseType: IosUploadResponse.self
      )
      lastUploadResultLine = "Uploaded \(res.date): status=\(res.status) delta=\(res.deltaMinutes?.description ?? "null")"
    } catch {
      lastUploadResultLine = "Upload failed: \(error.localizedDescription)"
    }
  }

  private func makeConnectionRequest() -> (url: URL, accessToken: String, body: IosConnectionPatchBody)? {
    guard let creds = CredentialsStore.loadNonEmpty() else {
      lastStatusLine = "Missing base URL or access token."
      return nil
    }
    guard TimeZone(identifier: timezoneId) != nil else {
      lastStatusLine = "Invalid timezone."
      return nil
    }
    do {
      let url = try ApiClient.endpointURL(baseURLString: creds.baseURLString, path: "/api/verification/ios/connection")
      let selectionPayload = SelectionStore.selectionPayload(forServerIfAvailable: selection)
      let body = IosConnectionPatchBody(enabled: true, timezone: timezoneId, selection: selectionPayload)
      return (url: url, accessToken: creds.accessToken, body: body)
    } catch {
      lastStatusLine = "Invalid base URL."
      return nil
    }
  }
}
