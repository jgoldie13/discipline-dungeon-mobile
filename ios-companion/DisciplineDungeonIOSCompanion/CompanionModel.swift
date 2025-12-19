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

  @Published private(set) var lastComputedMinutes: Int?
  @Published private(set) var computeError: String?

  init() {
    let creds = CredentialsStore.load()
    self.accessToken = creds.accessToken
    self.baseURLString = creds.baseURLString
    refreshComputedValue()
  }

  var selectionSummary: String {
    "Apps: \(selection.applicationTokens.count) • Categories: \(selection.categoryTokens.count) • Web: \(selection.webDomainTokens.count)"
  }

  var yesterdayDateString: String {
    LocalDay.yesterdayDateString(timeZoneId: timezoneId)
  }

  var canCompute: Bool {
    computeError = nil

    let status = AuthorizationCenter.shared.authorizationStatus
    if status != .approved {
      computeError = "Not authorized; request Screen Time access first"
      return false
    }

    if selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty && selection.webDomainTokens.isEmpty {
      computeError = "Selection is empty; choose apps/categories first"
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

  func persistCredentials() {
    CredentialsStore.save(.init(accessToken: accessToken, baseURLString: baseURLString))
    lastStatusLine = "Saved."
  }

  func persistSelection() {
    SelectionStore.save(selection)
    lastStatusLine = "Selection saved."
  }

  func stageComputationRequest() {
    let date = LocalDay.yesterdayDateString(timeZoneId: timezoneId)
    let req = ScreenTimeComputationRequest(date: date, timezone: timezoneId)
    if let encoded = try? JSONEncoder().encode(req) {
      let defaults = UserDefaults(suiteName: "group.com.disciplinedungeon.shared")
      defaults?.set(encoded, forKey: "dd.screentime.request.v1")
    }
  }

  func refreshComputedValue() {
    let defaults = UserDefaults(suiteName: "group.com.disciplinedungeon.shared")

    if let data = defaults?.data(forKey: "dd.screentime.snapshot.v1"),
       let snapshot = try? JSONDecoder().decode(ScreenTimeSnapshot.self, from: data) {
      lastComputedMinutes = snapshot.verifiedMinutes
    } else {
      lastComputedMinutes = nil
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

    guard let verifiedMinutes = lastComputedMinutes else {
      lastUploadResultLine = "No minutes computed yet. Compute first."
      return
    }

    let date = LocalDay.yesterdayDateString(timeZoneId: timezoneId)

    do {
      let url = try ApiClient.endpointURL(baseURLString: creds.baseURLString, path: "/api/verification/ios/upload")
      let raw = IosUploadRawPayload(
        source: "ios_deviceactivity_v2",
        timezone: timezoneId,
        selection: SelectionStore.selectionPayload(forServerIfAvailable: selection),
        computedAtISO8601: ISO8601DateFormatter().string(from: Date())
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
