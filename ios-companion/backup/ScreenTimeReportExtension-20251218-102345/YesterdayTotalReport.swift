import DeviceActivity
import SwiftUI

struct YesterdayTotalConfiguration {
  let verifiedMinutes: Int
  let date: String
  let timezone: String
}

struct YesterdayTotalReport: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .ddYesterdayTotal

  // Configuration -> View
  let content: (YesterdayTotalConfiguration) -> YesterdayTotalView

  // Configuration builder (NOT a View)
  func makeConfiguration(
    representing results: DeviceActivityResults<DeviceActivityData>
  ) async -> YesterdayTotalConfiguration {
    let groupID = "group.com.disciplinedungeon.shared"
    let defaults = UserDefaults(suiteName: groupID)

    // Read the current debug epoch
    let debugEpoch = defaults?.integer(forKey: "dd_debug_epoch") ?? 0

    // Write makeConfiguration markers with epoch
    defaults?.set(Date().timeIntervalSince1970, forKey: "dd_ext_makeconfig_ts")
    defaults?.set("makeConfiguration entered", forKey: "dd_ext_makeconfig_note")
    defaults?.set(debugEpoch, forKey: "dd_ext_makeconfig_epoch")

    defaults?.set(Date().timeIntervalSince1970, forKey: "dd_last_ext_run_ts")
    defaults?.set("ran makeConfiguration()", forKey: "dd_last_ext_run_note")

    let totalSeconds = await DeviceActivityAggregation.totalSeconds(results)
    let minutes = ScreenTimeReducer.verifiedMinutes(totalSeconds: totalSeconds)

    let req = ScreenTimeComputationRequestStore.load()
    let date = req?.date ?? "unknown"
    let timezone = req?.timezone ?? "unknown"

    ScreenTimeSnapshotStore.save(
      ScreenTimeSnapshot(date: date, timezone: timezone, verifiedMinutes: minutes, computedAt: Date())
    )

    // Write persistence completion epoch
    defaults?.set(debugEpoch, forKey: "dd_last_ext_run_epoch")

    return YesterdayTotalConfiguration(verifiedMinutes: minutes, date: date, timezone: timezone)
  }
}

struct YesterdayTotalView: View {
  let configuration: YesterdayTotalConfiguration

  var body: some View {
    VStack(spacing: 8) {
      Text("\(configuration.verifiedMinutes) minutes")
        .font(.title2)
        .fontWeight(.semibold)
      Text("Saved for \(configuration.date) (\(configuration.timezone))")
        .font(.footnote)
    }
  }
}

extension DeviceActivityReport.Context {
  static let ddYesterdayTotal = Self("dd_yesterday_total")
}

enum DeviceActivityAggregation {
  static func totalSeconds(_ results: DeviceActivityResults<DeviceActivityData>) async -> TimeInterval {
    var total: TimeInterval = 0
    for await data in results {
      for await segment in data.activitySegments {
        total += segment.totalActivityDuration
      }
    }
    return total
  }
}
