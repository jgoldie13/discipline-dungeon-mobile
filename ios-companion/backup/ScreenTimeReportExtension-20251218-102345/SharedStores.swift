import Foundation

enum AppGroup {
  static let identifier = "group.com.disciplinedungeon.shared"

  static var defaults: UserDefaults {
    UserDefaults(suiteName: identifier) ?? .standard
  }
}

struct ScreenTimeComputationRequest: Codable {
  let date: String
  let timezone: String
}

enum ScreenTimeComputationRequestStore {
  private static let key = "dd.screentime.request.v1"

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
}

enum ScreenTimeReducer {
  static func verifiedMinutes(totalSeconds: TimeInterval) -> Int {
    if totalSeconds.isNaN || totalSeconds.isInfinite { return 0 }
    if totalSeconds <= 0 { return 0 }
    return Int(totalSeconds) / 60
  }
}
