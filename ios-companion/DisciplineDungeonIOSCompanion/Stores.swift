import FamilyControls
import Foundation

enum AppGroup {
  static var defaults: UserDefaults? {
    AppGroupDiagnostics.defaults()
  }
}

struct Credentials: Codable {
  let accessToken: String
  let baseURLString: String
}

enum CredentialsStore {
  private static let key = "dd.credentials.v1"

  static func load() -> Credentials {
    guard let data = UserDefaults.standard.data(forKey: key) else {
      return Credentials(accessToken: "", baseURLString: "")
    }
    return (try? JSONDecoder().decode(Credentials.self, from: data))
      ?? Credentials(accessToken: "", baseURLString: "")
  }

  static func loadNonEmpty() -> Credentials? {
    let c = load()
    if c.accessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return nil }
    if c.baseURLString.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return nil }
    return c
  }

  static func save(_ c: Credentials) {
    if let data = try? JSONEncoder().encode(c) {
      UserDefaults.standard.set(data, forKey: key)
    }
  }

  static func migrate() -> String? {
    guard let creds = loadNonEmpty() else { return nil }
    let trimmed = creds.baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }
    BackendSettingsStore.save(BackendSettings(baseURL: trimmed))
    return trimmed
  }
}

struct BackendSettings: Codable {
  let baseURL: String
}

enum BackendSettingsStore {
  private static let key = "dd.backend.settings.v1"

  static func load() -> BackendSettings? {
    guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(BackendSettings.self, from: data)
  }

  static func save(_ settings: BackendSettings) {
    guard let data = try? JSONEncoder().encode(settings) else { return }
    UserDefaults.standard.set(data, forKey: key)
  }
}

struct IosSelectionPayload: Codable {
  let v: Int
  let encodedPlistBase64: String
  let applicationTokenCount: Int
  let categoryTokenCount: Int
  let webDomainTokenCount: Int
}

enum SelectionStore {
  private static let key = "dd.familyActivitySelection.plist.v1"

  static func load() -> FamilyActivitySelection {
    guard let defaults = AppGroup.defaults else { return FamilyActivitySelection() }
    guard let data = defaults.data(forKey: key) else { return FamilyActivitySelection() }
    do {
      return try PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
    } catch {
      return FamilyActivitySelection()
    }
  }

  static func save(_ selection: FamilyActivitySelection) {
    guard let defaults = AppGroup.defaults else { return }
    do {
      let data = try PropertyListEncoder().encode(selection)
      defaults.set(data, forKey: key)
    } catch {
      defaults.removeObject(forKey: key)
    }
  }

  static func selectionPayload(forServerIfAvailable selection: FamilyActivitySelection) -> IosSelectionPayload? {
    do {
      let data = try PropertyListEncoder().encode(selection)
      return IosSelectionPayload(
        v: 1,
        encodedPlistBase64: data.base64EncodedString(),
        applicationTokenCount: selection.applicationTokens.count,
        categoryTokenCount: selection.categoryTokens.count,
        webDomainTokenCount: selection.webDomainTokens.count
      )
    } catch {
      return nil
    }
  }
}

enum ScreenTimeComputationRequestStore {
  private static let key = ScreenTimeShared.Keys.request

  static func save(_ req: ScreenTimeComputationRequest) {
    guard let defaults = AppGroup.defaults else { return }
    guard let data = try? JSONEncoder().encode(req) else { return }
    defaults.set(data, forKey: key)
  }

  static func load() -> ScreenTimeComputationRequest? {
    guard let defaults = AppGroup.defaults else { return nil }
    guard let data = defaults.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(ScreenTimeComputationRequest.self, from: data)
  }
}

enum ScreenTimeSnapshotStore {
  private static let key = ScreenTimeShared.Keys.snapshot

  static func save(_ snapshot: ScreenTimeSnapshot) {
    guard let defaults = AppGroup.defaults else { return }
    guard let data = try? JSONEncoder().encode(snapshot) else { return }
    defaults.set(data, forKey: key)
  }

  static func load() -> ScreenTimeSnapshot? {
    guard let defaults = AppGroup.defaults else { return nil }
    guard let data = defaults.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(ScreenTimeSnapshot.self, from: data)
  }
}
