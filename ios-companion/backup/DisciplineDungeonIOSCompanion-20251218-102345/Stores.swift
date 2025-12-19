import FamilyControls
import Foundation

enum AppGroup {
  static let identifier = "group.com.disciplinedungeon.shared"

  static var defaults: UserDefaults {
    UserDefaults(suiteName: identifier) ?? .standard
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
    guard let data = AppGroup.defaults.data(forKey: key) else { return FamilyActivitySelection() }
    do {
      return try PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
    } catch {
      return FamilyActivitySelection()
    }
  }

  static func save(_ selection: FamilyActivitySelection) {
    do {
      let data = try PropertyListEncoder().encode(selection)
      AppGroup.defaults.set(data, forKey: key)
    } catch {
      AppGroup.defaults.removeObject(forKey: key)
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

struct ScreenTimeComputationRequest: Codable {
  let date: String
  let timezone: String
}

enum ScreenTimeComputationRequestStore {
  private static let key = "dd.screentime.request.v1"

  static func save(_ req: ScreenTimeComputationRequest) {
    if let data = try? JSONEncoder().encode(req) {
      AppGroup.defaults.set(data, forKey: key)
    }
  }

  static func load() -> ScreenTimeComputationRequest? {
    guard let data = AppGroup.defaults.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(ScreenTimeComputationRequest.self, from: data)
  }
}

struct ScreenTimeSnapshot: Codable {
  let date: String
  let timezone: String
  let verifiedMinutes: Int
  let computedAt: Date
}

enum ScreenTimeSnapshotStore {
  private static let key = "dd.screentime.snapshot.v1"

  static func save(_ snapshot: ScreenTimeSnapshot) {
    if let data = try? JSONEncoder().encode(snapshot) {
      AppGroup.defaults.set(data, forKey: key)
    }
  }

  static func load() -> ScreenTimeSnapshot? {
    guard let data = AppGroup.defaults.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(ScreenTimeSnapshot.self, from: data)
  }
}

