import DeviceActivity
import SwiftUI

extension DeviceActivityReport.Context {
  static let totalActivity = Self("Total Activity")
}

struct TotalActivityReport: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .totalActivity
  let content: (ActivityReport) -> TotalActivityView

  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> ActivityReport {
    // Write marker immediately
    let groupID = "group.com.disciplinedungeon.shared"
    let defaults = UserDefaults(suiteName: groupID)
    defaults?.set(Date().timeIntervalSince1970, forKey: "dd_ext_invoked_ts")
    defaults?.set("Extension makeConfiguration called", forKey: "dd_ext_invoked_note")

    var totalDuration: TimeInterval = 0

    for await activity in data {
      for await segment in activity.activitySegments {
        totalDuration += segment.totalActivityDuration
      }
    }

    let minutes = max(0, Int(totalDuration / 60))

    // Load the computation request to get date/timezone
    let reqData = defaults?.data(forKey: "dd.screentime.request.v1")
    let req = reqData.flatMap { try? JSONDecoder().decode(ScreenTimeComputationRequest.self, from: $0) }

    // Save result
    let snapshot = ScreenTimeSnapshot(
      date: req?.date ?? "unknown",
      timezone: req?.timezone ?? "unknown",
      verifiedMinutes: minutes,
      computedAt: Date()
    )

    if let encoded = try? JSONEncoder().encode(snapshot) {
      defaults?.set(encoded, forKey: "dd.screentime.snapshot.v1")
    }

    defaults?.set(Date().timeIntervalSince1970, forKey: "dd_ext_completed_ts")
    defaults?.set("Saved \(minutes) minutes", forKey: "dd_ext_completed_note")

    return ActivityReport(totalMinutes: minutes)
  }
}

struct ActivityReport {
  let totalMinutes: Int
}

struct TotalActivityView: View {
  let activityReport: ActivityReport

  var body: some View {
    VStack(spacing: 12) {
      Text("\(activityReport.totalMinutes)")
        .font(.system(size: 48, weight: .bold))
      Text("minutes")
        .font(.headline)
        .foregroundColor(.secondary)
    }
    .padding()
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
