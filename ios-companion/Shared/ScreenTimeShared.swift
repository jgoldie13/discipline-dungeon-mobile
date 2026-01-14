import Foundation

enum ScreenTimeShared {
  static let appGroupID = "group.com.disciplinedungeon.shared"

  enum Keys {
    static let diagnosticTest = "dd_diagnostic_test"
    static let request = "dd.screentime.request.v1"
    static let snapshot = "dd.screentime.snapshot.v1"
    static let extInvokedTs = "dd_ext_invoked_ts"
    static let extCompletedTs = "dd_ext_completed_ts"
    static let extInvokedNote = "dd_ext_invoked_note"
    static let extCompletedNote = "dd_ext_completed_note"
    static let extLastError = "dd_ext_last_error"
  }

  enum Files {
    static let heartbeat = "dd_heartbeat.txt"
    static let snapshot = "dd_snapshot.json"
  }
}

struct ScreenTimeSnapshot: Codable {
  let date: String
  let timezone: String
  let verifiedMinutes: Int
  let computedAt: Date
}

struct ScreenTimeComputationRequest: Codable {
  let date: String
  let timezone: String
}
