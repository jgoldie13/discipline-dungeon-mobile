import DeviceActivity
import SwiftUI
import OSLog

extension DeviceActivityReport.Context {
  static let totalActivity = Self("Total Activity")
}

private let log = Logger(subsystem: "com.disciplinedungeon.ios-companion", category: "ScreenTimeReportExtension")

struct TotalActivityReport: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .totalActivity
  let content: (ActivityReport) -> TotalActivityView

  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> ActivityReport {
    let startDate = Date()
    log.info("🚀 Extension makeConfiguration called at \(startDate, privacy: .public)")

    // Write heartbeat immediately
    let heartbeatResult = AppGroupDiagnostics.writeHeartbeatFile(label: "extension-start")
    if case .failure(let error) = heartbeatResult {
      log.error("❌ Heartbeat file write failed: \(error.localizedDescription, privacy: .public)")
    }

    // Check App Group access
    guard let defaults = AppGroupDiagnostics.defaults() else {
      log.error("❌ CRITICAL: App Group UserDefaults unavailable - provisioning issue")
      // Store error in a fallback location if possible
      UserDefaults.standard.set("AppGroupUnavailable", forKey: "dd_ext_last_error_fallback")
      return ActivityReport(totalMinutes: 0)
    }

    guard let containerURL = AppGroupDiagnostics.containerURL() else {
      log.error("❌ CRITICAL: App Group container URL unavailable - provisioning issue")
      defaults.set("AppGroupContainerUnavailable", forKey: "dd_ext_last_error")
      return ActivityReport(totalMinutes: 0)
    }

    log.info("✓ App Group accessible: \(containerURL.path, privacy: .public)")

    // Record invocation
    defaults.set(Date().timeIntervalSince1970, forKey: "dd_ext_invoked_ts")
    defaults.set("Extension makeConfiguration called", forKey: "dd_ext_invoked_note")
    defaults.removeObject(forKey: "dd_ext_last_error")

    // Load the computation request to get date/timezone
    let reqData = defaults.data(forKey: "dd.screentime.request.v1")
    let req = reqData.flatMap { try? JSONDecoder().decode(ScreenTimeComputationRequest.self, from: $0) }

    if let req = req {
      log.info("📋 Request loaded: date=\(req.date, privacy: .public) timezone=\(req.timezone, privacy: .public)")
    } else {
      log.warning("⚠️ No computation request found in shared defaults")
    }

    // Calculate total duration
    var totalDuration: TimeInterval = 0

    for await activity in data {
      for await segment in activity.activitySegments {
        totalDuration += segment.totalActivityDuration
      }
    }

    let minutes = max(0, Int(totalDuration / 60))
    log.info("📊 Computed duration: \(minutes, privacy: .public) minutes (\(totalDuration, privacy: .public) seconds)")

    // Save snapshot to UserDefaults
    let snapshot = ScreenTimeSnapshot(
      date: req?.date ?? "unknown",
      timezone: req?.timezone ?? "unknown",
      verifiedMinutes: minutes,
      computedAt: Date()
    )

    if let encoded = try? JSONEncoder().encode(snapshot) {
      defaults.set(encoded, forKey: "dd.screentime.snapshot.v1")
      log.info("✓ Snapshot saved to UserDefaults: \(minutes, privacy: .public) minutes for \(snapshot.date, privacy: .public)")
    } else {
      log.error("❌ Failed to encode snapshot to JSON")
    }

    // ALSO write snapshot as a file (redundancy)
    let snapshotFileURL = containerURL.appendingPathComponent("dd_snapshot.json")
    do {
      let jsonData = try JSONEncoder().encode(snapshot)
      try jsonData.write(to: snapshotFileURL, options: .atomic)
      log.info("✓ Snapshot file written to: \(snapshotFileURL.path, privacy: .public)")
    } catch {
      log.error("❌ Snapshot file write failed: \(error.localizedDescription, privacy: .public)")
    }

    // Record completion
    defaults.set(Date().timeIntervalSince1970, forKey: "dd_ext_completed_ts")
    defaults.set("Saved \(minutes) minutes", forKey: "dd_ext_completed_note")

    let duration = Date().timeIntervalSince(startDate)
    log.info("✅ Extension completed in \(duration, privacy: .public) seconds")

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
