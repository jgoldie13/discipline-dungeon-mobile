import DeviceActivity
import SwiftUI

struct YesterdayTotalReport: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .ddYesterdayTotal

  // Configuration -> View
  let content: (DeviceActivityResults<DeviceActivityData>) -> YesterdayTotalView

  // Configuration builder (NOT a View)
  func makeConfiguration(
    representing results: DeviceActivityResults<DeviceActivityData>
  ) async -> DeviceActivityResults<DeviceActivityData> {
    results
  }
}

struct YesterdayTotalView: View {
  let results: DeviceActivityResults<DeviceActivityData>

  @State private var verifiedMinutes: Int?
  @State private var writeStatus: String?

  var body: some View {
    VStack(spacing: 8) {
      if let minutes = verifiedMinutes {
        Text("\(minutes) minutes")
          .font(.title2)
          .fontWeight(.semibold)
        if let status = writeStatus {
          Text(status).font(.footnote)
        }
      } else {
        Text("Loading…").font(.footnote)
      }
    }
    .task { await computeAndPersist() }
  }

  private func computeAndPersist() async {
    let groupID = "group.com.disciplinedungeon.shared"
    let defaults = UserDefaults(suiteName: groupID)

    defaults?.set(Date().timeIntervalSince1970, forKey: "dd_last_ext_run_ts")
    defaults?.set("ran computeAndPersist()", forKey: "dd_last_ext_run_note")

    defaults?.set("ping-ext", forKey: "dd_test_ext")
    print("EXT readBack:", defaults?.string(forKey: "dd_test_ext") as Any)

    let totalSeconds = await DeviceActivityAggregation.totalSeconds(results)
    let minutes = ScreenTimeReducer.verifiedMinutes(totalSeconds: totalSeconds)

    let req = ScreenTimeComputationRequestStore.load()
    let date = req?.date ?? "unknown"
    let timezone = req?.timezone ?? "unknown"

    ScreenTimeSnapshotStore.save(
      ScreenTimeSnapshot(date: date, timezone: timezone, verifiedMinutes: minutes, computedAt: Date())
    )

    verifiedMinutes = minutes
    writeStatus = "Saved for \(date)."
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
