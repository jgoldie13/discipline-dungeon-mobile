import Foundation

enum AppGroupDiagnosticsError: Error, LocalizedError {
  case containerUnavailable
  case defaultsUnavailable
  case writeFailed(String)
  case readFailed(String)

  var errorDescription: String? {
    switch self {
    case .containerUnavailable:
      return "App Group container is unavailable. Check Apple Developer portal App Group + provisioning profile for both targets."
    case .defaultsUnavailable:
      return "App Group UserDefaults is unavailable. Check provisioning profile."
    case .writeFailed(let message):
      return "Write failed: \(message)"
    case .readFailed(let message):
      return "Read failed: \(message)"
    }
  }
}

enum AppGroupDiagnostics {
  static let appGroupID = "group.com.disciplinedungeon.shared"

  /// Get the shared container URL (nil means provisioning issue)
  static func containerURL() -> URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupID)
  }

  /// Get the shared UserDefaults (nil means provisioning issue)
  static func defaults() -> UserDefaults? {
    UserDefaults(suiteName: appGroupID)
  }

  /// Write a test value to App Group defaults
  static func writeTestValue() -> Result<Void, Error> {
    guard let defaults = defaults() else {
      return .failure(AppGroupDiagnosticsError.defaultsUnavailable)
    }

    let testValue = "test-\(Date().timeIntervalSince1970)"
    defaults.set(testValue, forKey: "dd_diagnostic_test")
    defaults.synchronize()

    return .success(())
  }

  /// Read the test value from App Group defaults
  static func readTestValue() -> Result<String, Error> {
    guard let defaults = defaults() else {
      return .failure(AppGroupDiagnosticsError.defaultsUnavailable)
    }

    guard let value = defaults.string(forKey: "dd_diagnostic_test") else {
      return .failure(AppGroupDiagnosticsError.readFailed("No value found for dd_diagnostic_test"))
    }

    return .success(value)
  }

  /// Write a heartbeat file to the container
  static func writeHeartbeatFile(label: String) -> Result<Void, Error> {
    guard let containerURL = containerURL() else {
      return .failure(AppGroupDiagnosticsError.containerUnavailable)
    }

    let heartbeatURL = containerURL.appendingPathComponent("dd_heartbeat.txt")
    let content = "\(label) at \(Date())"

    do {
      try content.write(to: heartbeatURL, atomically: true, encoding: .utf8)
      return .success(())
    } catch {
      return .failure(AppGroupDiagnosticsError.writeFailed(error.localizedDescription))
    }
  }

  /// Dump snapshot-related debug info
  static func snapshotDebugDump() -> String {
    var lines: [String] = []

    // Container check
    if let containerURL = containerURL() {
      lines.append("✓ Container URL: \(containerURL.path)")
    } else {
      lines.append("✗ Container URL: nil (PROVISIONING ISSUE)")
    }

    // Defaults check
    if let defaults = defaults() {
      lines.append("✓ UserDefaults: accessible")

      // Check for key data
      let keys = [
        "dd.screentime.request.v1",
        "dd.screentime.snapshot.v1",
        "dd_ext_invoked_ts",
        "dd_ext_completed_ts",
        "dd_ext_invoked_note",
        "dd_ext_completed_note",
        "dd_ext_last_error"
      ]

      for key in keys {
        if let _ = defaults.object(forKey: key) {
          lines.append("  ✓ \(key): present")
        } else {
          lines.append("  - \(key): nil")
        }
      }

      // Timestamps
      if let invokedTs = defaults.double(forKey: "dd_ext_invoked_ts"), invokedTs > 0 {
        lines.append("  Extension invoked: \(Date(timeIntervalSince1970: invokedTs))")
      }
      if let completedTs = defaults.double(forKey: "dd_ext_completed_ts"), completedTs > 0 {
        lines.append("  Extension completed: \(Date(timeIntervalSince1970: completedTs))")
      }
      if let error = defaults.string(forKey: "dd_ext_last_error") {
        lines.append("  ⚠️ Last error: \(error)")
      }
    } else {
      lines.append("✗ UserDefaults: nil (PROVISIONING ISSUE)")
    }

    return lines.joined(separator: "\n")
  }

  /// Run full self-test
  static func runSelfTest() -> (success: Bool, report: String) {
    var lines: [String] = []
    var allSuccess = true

    // Test 1: Container URL
    if containerURL() != nil {
      lines.append("✓ Container URL accessible")
    } else {
      lines.append("✗ Container URL is nil")
      allSuccess = false
    }

    // Test 2: UserDefaults
    if defaults() != nil {
      lines.append("✓ UserDefaults accessible")
    } else {
      lines.append("✗ UserDefaults is nil")
      allSuccess = false
    }

    // Test 3: Write test value
    switch writeTestValue() {
    case .success:
      lines.append("✓ Write test value succeeded")
    case .failure(let error):
      lines.append("✗ Write failed: \(error.localizedDescription)")
      allSuccess = false
    }

    // Test 4: Read test value
    switch readTestValue() {
    case .success(let value):
      lines.append("✓ Read test value succeeded: \(value)")
    case .failure(let error):
      lines.append("✗ Read failed: \(error.localizedDescription)")
      allSuccess = false
    }

    // Test 5: Write heartbeat file
    switch writeHeartbeatFile(label: "self-test") {
    case .success:
      lines.append("✓ Heartbeat file write succeeded")
    case .failure(let error):
      lines.append("✗ Heartbeat write failed: \(error.localizedDescription)")
      allSuccess = false
    }

    if !allSuccess {
      lines.append("")
      lines.append("RECOMMENDED NEXT STEPS:")
      lines.append("1. Check Apple Developer portal: App Group exists")
      lines.append("2. Check provisioning profiles include App Group")
      lines.append("3. Check both targets have App Group capability")
      lines.append("4. Reinstall app from Xcode (clean build)")
    }

    return (allSuccess, lines.joined(separator: "\n"))
  }
}
