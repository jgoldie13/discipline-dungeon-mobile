import DeviceActivity
import FamilyControls
import SwiftUI

struct ContentView: View {
  @ObservedObject var model: CompanionModel

  @State private var isShowingReport = false
  @State private var remainingSeconds = 10
  @State private var countdownTimer: Timer?

  var body: some View {
    TabView {
      setupTab
        .tabItem { Label("Setup", systemImage: "gearshape") }
      selectionTab
        .tabItem { Label("Selection", systemImage: "checklist") }
      yesterdayTab
        .tabItem { Label("Yesterday", systemImage: "clock") }
      diagnosticsTab
        .tabItem { Label("Diagnostics", systemImage: "stethoscope") }
    }
    .task {
      await model.refreshAuthorizationStatus()
    }
  }

  private var setupTab: some View {
    Form {
      Section("Auth") {
        SecureField("Supabase access token (Bearer)", text: $model.accessToken)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()

        TextField("Base URL (e.g. https://your-domain.vercel.app)", text: $model.baseURLString)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()

        Button("Save") { model.persistCredentials() }

        if let status = model.lastStatusLine {
          Text(status).font(.footnote)
        }
      }

      Section("Screen Time permission") {
        Text("Status: \(model.authorizationStatusDescription)")
          .font(.footnote)

        Button("Request Screen Time access") {
          Task { await model.requestScreenTimeAuthorization() }
        }
      }

      Section("Timezone") {
        TextField("IANA timezone", text: $model.timezoneId)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
        Button("Use device timezone") { model.timezoneId = TimeZone.current.identifier }
      }
    }
  }

  private var selectionTab: some View {
    Form {
      Section("Pick apps/categories") {
        FamilyActivityPicker(selection: $model.selection)
          .frame(minHeight: 320)
      }

      Section("Storage") {
        Button("Save selection locally") { model.persistSelection() }
        Text(model.selectionSummary).font(.footnote)
      }

      Section("Backend sync") {
        Button("Sync selection + timezone to backend") {
          Task { await model.syncConnectionToBackend() }
        }
      }
    }
  }

  private var yesterdayTab: some View {
    Form {
      // App Group health warning
      if AppGroupDiagnostics.containerURL() == nil {
        Section {
          VStack(alignment: .leading, spacing: 8) {
            Text("⚠️ Shared container unavailable")
              .font(.headline)
              .foregroundColor(.red)
            Text("This is usually an App Group provisioning issue. Check Diagnostics → App Group Self-Test for details.")
              .font(.footnote)
              .foregroundColor(.secondary)
          }
        }
      }

      Section("Compute") {
        Text("Target date: \(model.yesterdayDateString)")
          .font(.footnote)
        Button("Compute yesterday minutes") {
          guard model.canCompute else { return }
          model.stageComputationRequest()
          isShowingReport = true
        }
        if let error = model.computeError {
          Text(error)
            .font(.footnote)
            .foregroundColor(.red)
        }
      }

      Section("Latest computed") {
        if let minutes = model.lastComputedMinutes {
          Text("\(minutes) minutes")
            .font(.headline)
        } else {
          Text("No computed value yet. Tap \"Compute yesterday minutes\".")
            .font(.footnote)
        }

        Button("Refresh snapshot") {
          model.refreshComputedValue()
        }
      }

      Section("Upload") {
        Button("Upload yesterday") {
          Task { await model.uploadYesterday() }
        }

        if let result = model.lastUploadResultLine {
          Text(result).font(.footnote)
        }
      }
    }
    .sheet(isPresented: $isShowingReport) {
      NavigationStack {
        VStack(spacing: 20) {
          Text("Computing Screen Time…")
            .font(.headline)

          if remainingSeconds > 0 {
            Text("Keep this open for \(remainingSeconds) more seconds")
              .font(.footnote)
              .foregroundColor(.orange)
          } else {
            Text("Report generation complete. You can now close this.")
              .font(.footnote)
              .foregroundColor(.green)
          }

          if let filter = model.makeYesterdayFilter() {
            DeviceActivityReport(.totalActivity, filter: filter)
              .frame(height: 200)
              .onAppear {
                print("DEBUG: DeviceActivityReport appeared with filter for date interval")
              }
          } else {
            Text("Missing selection or timezone")
              .font(.footnote)
              .foregroundColor(.red)
              .onAppear {
                print("DEBUG: No valid filter - selection empty or invalid timezone")
              }
          }

          Spacer()
        }
        .padding()
        .navigationTitle("Yesterday Report")
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Button("Done") {
              print("DEBUG: Done button tapped")
              stopCountdown()
              isShowingReport = false
              model.refreshComputedValue()
              print("DEBUG: After refreshComputedValue()")
            }
            .disabled(remainingSeconds > 0)
          }
        }
        .onAppear {
          startCountdown()
        }
        .onDisappear {
          stopCountdown()
        }
      }
    }
  }

  private var diagnosticsTab: some View {
    DiagnosticsView()
  }

  private func startCountdown() {
    remainingSeconds = 10
    countdownTimer?.invalidate()
    countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
      if remainingSeconds > 0 {
        remainingSeconds -= 1
      } else {
        stopCountdown()
      }
    }
  }

  private func stopCountdown() {
    countdownTimer?.invalidate()
    countdownTimer = nil
  }
}

struct DiagnosticsView: View {
  @State private var selfTestReport: String = "Not run yet"
  @State private var selfTestSuccess: Bool = false
  @State private var snapshotDump: String = ""
  @State private var lastInvoked: Date?
  @State private var lastCompleted: Date?
  @State private var lastError: String?

  var body: some View {
    Form {
      Section("App Group Self-Test") {
        Button("Run App Group Self-Test") {
          let result = AppGroupDiagnostics.runSelfTest()
          selfTestSuccess = result.success
          selfTestReport = result.report
        }

        Text(selfTestReport)
          .font(.system(.footnote, design: .monospaced))
          .foregroundColor(selfTestSuccess ? .green : .red)
      }

      Section("Container Info") {
        if let containerURL = AppGroupDiagnostics.containerURL() {
          VStack(alignment: .leading, spacing: 4) {
            Text("Container URL:")
              .font(.caption)
              .foregroundColor(.secondary)
            Text(containerURL.path)
              .font(.system(.footnote, design: .monospaced))
          }
        } else {
          Text("Container URL: nil (PROVISIONING ISSUE)")
            .font(.footnote)
            .foregroundColor(.red)
        }
      }

      Section("Snapshot Debug Dump") {
        Button("Refresh Snapshot Dump") {
          snapshotDump = AppGroupDiagnostics.snapshotDebugDump()
          refreshExtensionMarkers()
        }

        if !snapshotDump.isEmpty {
          Text(snapshotDump)
            .font(.system(.footnote, design: .monospaced))
        }
      }

      Section("Last Extension Run") {
        if let lastInvoked {
          Text("Invoked: \(lastInvoked.formatted(date: .abbreviated, time: .standard))")
        } else {
          Text("Invoked: nil")
            .foregroundColor(.secondary)
        }

        if let lastCompleted {
          Text("Completed: \(lastCompleted.formatted(date: .abbreviated, time: .standard))")
        } else {
          Text("Completed: nil")
            .foregroundColor(.secondary)
        }

        if let lastError {
          Text("Last error: \(lastError)")
            .foregroundColor(.red)
        } else {
          Text("Last error: nil")
            .foregroundColor(.secondary)
        }
      }

      Section("Developer Mode") {
        Text("Debugger attached (best effort): \(DebuggerStatus.isAttached ? "Yes" : "No")")
          .font(.footnote)
          .foregroundColor(.secondary)
      }
    }
    .navigationTitle("Diagnostics")
    .onAppear {
      snapshotDump = AppGroupDiagnostics.snapshotDebugDump()
      refreshExtensionMarkers()
    }
  }

  private func refreshExtensionMarkers() {
    guard let defaults = AppGroupDiagnostics.defaults() else {
      lastInvoked = nil
      lastCompleted = nil
      lastError = "AppGroupDefaultsUnavailable"
      return
    }
    let invokedTs = defaults.double(forKey: ScreenTimeShared.Keys.extInvokedTs)
    let completedTs = defaults.double(forKey: ScreenTimeShared.Keys.extCompletedTs)
    lastInvoked = invokedTs > 0 ? Date(timeIntervalSince1970: invokedTs) : nil
    lastCompleted = completedTs > 0 ? Date(timeIntervalSince1970: completedTs) : nil
    lastError = defaults.string(forKey: ScreenTimeShared.Keys.extLastError)
  }
}
