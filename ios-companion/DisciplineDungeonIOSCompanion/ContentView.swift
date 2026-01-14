import DeviceActivity
import FamilyControls
import Foundation
import SwiftUI

struct ContentView: View {
  @ObservedObject var model: CompanionModel
  @EnvironmentObject private var authManager: SupabaseAuthManager

  var body: some View {
    // Show sign-in screen if not authenticated
    if !authManager.isAuthenticated {
      SignInView()
    } else {
      // Main app tabs when signed in
      TabView {
        setupTab
          .tabItem { Label("Setup", systemImage: "gearshape") }
        selectionTab
          .tabItem { Label("Selection", systemImage: "checklist") }
        if FeatureFlags.enforcementEnabled {
          enforcementTab
            .tabItem { Label("Enforcement", systemImage: "lock.shield") }
        } else {
          EnforcementDisabledView()
            .tabItem { Label("Enforcement", systemImage: "lock.slash") }
        }
        verificationTab
          .tabItem { Label("Verify", systemImage: "checkmark.shield") }
        diagnosticsTab
          .tabItem { Label("Diagnostics", systemImage: "stethoscope") }
      }
      .task {
        await model.refreshAuthorizationStatus()
      }
    }
  }

  private var setupTab: some View {
    Form {
      Section("Account") {
        if let user = authManager.currentUser {
          VStack(alignment: .leading, spacing: 4) {
            Text("Signed in as:")
              .font(.caption)
              .foregroundColor(.secondary)
            Text(user.email ?? "No email")
              .font(.footnote)
          }

          Button("Sign Out") {
            Task {
              try? await authManager.signOut()
            }
          }
          .foregroundColor(.red)
        }
      }

      Section("Backend") {
        TextField("Base URL (e.g. https://your-domain.vercel.app)", text: $model.baseURLString)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()

        Button("Save Base URL") {
          model.saveBaseURL()
        }

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

  private var enforcementTab: some View {
    Form {
      Section("Authorization") {
        Text("Status: \(model.authorizationStatusDescription)")
          .font(.footnote)

        Button("Request Screen Time access") {
          Task { await model.requestScreenTimeAuthorization() }
        }
      }

      Section("Plan") {
        Stepper(value: $model.dailyCapMinutes, in: 1...240, step: 1) {
          Text("Daily cap: \(model.dailyCapMinutes) minutes")
        }

        Toggle("Enable daily cap enforcement", isOn: $model.enforcementEnabled)

        Text("Selection: \(model.selectionSummary)")
          .font(.footnote)
          .foregroundColor(.secondary)

        Button("Apply enforcement plan") {
          model.applyEnforcementPlan()
        }

        if let status = model.lastStatusLine {
          Text(status).font(.footnote)
        }
      }

      Section("Today") {
        Text("Status: \(model.enforcementStatus)")
          .font(.headline)

        if let detail = model.enforcementDetail {
          Text(detail)
            .font(.footnote)
            .foregroundColor(.secondary)
        }

        Button("Refresh status") {
          model.refreshEnforcementStatus()
        }

        Text("Monitoring active: \(model.monitoringActive ? "Yes" : "No")")
          .font(.footnote)
          .foregroundColor(.secondary)

        if let lastMonitorRun = model.lastMonitorRunAt {
          Text("Last monitor run: \(lastMonitorRun.formatted(date: .abbreviated, time: .standard))")
        } else {
          Text("Last monitor run: nil")
            .foregroundColor(.secondary)
        }

        if let thresholdHit = model.thresholdHitAt {
          Text("Threshold hit: \(thresholdHit.formatted(date: .abbreviated, time: .standard))")
        } else {
          Text("Threshold hit: nil")
            .foregroundColor(.secondary)
        }
      }

      Section("Sync") {
        Button("Sync enforcement events") {
          Task { await model.syncEnforcementEvents() }
        }

        if let syncLine = model.lastEnforcementSyncLine {
          Text(syncLine).font(.footnote)
        }
      }

      Section("App Group") {
        if AppGroupDiagnostics.containerURL() == nil {
          Text("Shared container unavailable (provisioning issue)")
            .font(.footnote)
            .foregroundColor(.red)
        } else {
          Text("Shared container available")
            .font(.footnote)
            .foregroundColor(.secondary)
        }
      }
    }
    .onAppear {
      model.refreshEnforcementStatus()
    }
  }

  private var verificationTab: some View {
    NavigationView {
      Form {
        Section("Yesterday's Screen Time") {
          NavigationLink("Compute yesterday's minutes") {
            ScreenTimeComputeView(model: model)
          }

          if let minutes = model.lastComputedMinutes {
            Text("Computed: \(minutes) minutes")
              .font(.headline)
              .foregroundColor(.green)
          } else {
            Text("Not computed yet")
              .font(.footnote)
              .foregroundColor(.secondary)
          }

          if let line = model.lastComputeResultLine {
            Text(line)
              .font(.footnote)
              .foregroundColor(.secondary)
          }
        }

        Section("Upload to Backend") {
          Button("Upload yesterday's data") {
            Task { await model.uploadYesterday() }
          }
          .disabled(model.lastComputedMinutes == nil)

          if let line = model.lastUploadResultLine {
            Text(line)
              .font(.footnote)
          }
        }

        Section("Instructions") {
          VStack(alignment: .leading, spacing: 8) {
            Text("1. Tap 'Compute yesterday's minutes'")
            Text("2. Keep the report screen open for 5-10 seconds")
            Text("3. Go back when you see the green checkmark")
            Text("4. Tap 'Upload yesterday's data' to sync with web app")
            Text("5. Check the web PWA's 'Truth' section to see verification")
          }
          .font(.footnote)
          .foregroundColor(.secondary)
        }
      }
      .navigationTitle("Verification")
    }
  }

  private var diagnosticsTab: some View {
    DiagnosticsView()
  }

}

struct SignInView: View {
  @EnvironmentObject private var authManager: SupabaseAuthManager
  @State private var email: String = ""
  @State private var password: String = ""
  @State private var isSubmitting = false
  @State private var localError: String?

  var body: some View {
    NavigationView {
      Form {
        Section("Sign In") {
          TextField("Email", text: $email)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(.emailAddress)

          SecureField("Password", text: $password)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()

          Button(isSubmitting ? "Signing in..." : "Sign In") {
            Task { await submitSignIn() }
          }
          .disabled(isSubmitting || email.isEmpty || password.isEmpty)
        }

        if let error = localError ?? authManager.lastError {
          Section("Auth Status") {
            Text(error)
              .font(.footnote)
              .foregroundColor(.red)
          }
        }
      }
      .navigationTitle("Sign In")
    }
  }

  private func submitSignIn() async {
    guard !isSubmitting else { return }
    isSubmitting = true
    localError = nil
    defer { isSubmitting = false }

    do {
      try await authManager.signIn(email: email, password: password)
    } catch {
      localError = error.localizedDescription
    }
  }
}

struct EnforcementDisabledView: View {
  var body: some View {
    NavigationView {
      VStack(spacing: 12) {
        Image(systemName: "lock.slash")
          .font(.system(size: 48))
          .foregroundColor(.secondary)
        Text("Enforcement Disabled")
          .font(.headline)
        Text("Daily cap enforcement is not enabled in this build.")
          .font(.footnote)
          .foregroundColor(.secondary)
          .multilineTextAlignment(.center)
          .padding(.horizontal)
      }
      .navigationTitle("Enforcement")
    }
  }
}

struct DiagnosticsView: View {
  @State private var selfTestReport: String = "Not run yet"
  @State private var selfTestSuccess: Bool = false
  @State private var snapshotDump: String = ""
  @State private var lastInvoked: Date?
  @State private var lastCompleted: Date?
  @State private var lastError: String?
  #if DEBUG
  @State private var embeddedPlugInsURL: String = "nil"
  @State private var embeddedPlugIns: [String] = []
  #endif

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

      if !FeatureFlags.enforcementEnabled {
        Section("Enforcement") {
          Text("Enforcement is disabled in this build.")
            .font(.footnote)
            .foregroundColor(.secondary)
        }
      }

      #if DEBUG
      Section("Embedded Extensions") {
        Button("Refresh Embedded Extensions") {
          refreshEmbeddedExtensions()
        }

        VStack(alignment: .leading, spacing: 4) {
          Text("builtInPlugInsURL:")
            .font(.caption)
            .foregroundColor(.secondary)
          Text(embeddedPlugInsURL)
            .font(.system(.footnote, design: .monospaced))
        }

        if embeddedPlugIns.isEmpty {
          Text("PlugIns: (empty)")
            .font(.footnote)
            .foregroundColor(.secondary)
        } else {
          Text("PlugIns:")
            .font(.caption)
            .foregroundColor(.secondary)
          ForEach(embeddedPlugIns, id: \.self) { name in
            Text(name)
              .font(.system(.footnote, design: .monospaced))
          }
        }
      }
      #endif

      Section("Snapshot Debug Dump (Deprecated)") {
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
      #if DEBUG
      refreshEmbeddedExtensions()
      #endif
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

  #if DEBUG
  private func refreshEmbeddedExtensions() {
    let url = Bundle.main.builtInPlugInsURL
    embeddedPlugInsURL = url?.path ?? "nil"

    var names: [String] = []
    if let url {
      do {
        let contents = try FileManager.default.contentsOfDirectory(
          at: url,
          includingPropertiesForKeys: nil,
          options: [.skipsHiddenFiles]
        )
        names = contents.map { $0.lastPathComponent }.sorted()
      } catch {
        names = ["(error: \\(error.localizedDescription))"]
      }
    }

    embeddedPlugIns = names
    print("[dd-embed] builtInPlugInsURL: \\(embeddedPlugInsURL)")
    if embeddedPlugIns.isEmpty {
      print("[dd-embed] PlugIns: (empty)")
    } else {
      print("[dd-embed] PlugIns: \\(embeddedPlugIns.joined(separator: \", \"))")
    }
  }
  #endif
}

// MARK: - Screen Time Compute View
struct ScreenTimeComputeView: View {
  @ObservedObject var model: CompanionModel
  @Environment(\.dismiss) private var dismiss
  @State private var showReport = false

  var body: some View {
    VStack(spacing: 20) {
      Text("Computing Yesterday's Screen Time")
        .font(.headline)

      if model.isComputing {
        ProgressView()
          .progressViewStyle(.circular)
        Text("Please wait 5-10 seconds...")
          .font(.caption)
          .foregroundColor(.secondary)
      } else if let minutes = model.lastComputedMinutes {
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: 60))
          .foregroundColor(.green)
        Text("\(minutes) minutes")
          .font(.title)
        Text("Tap back to upload this data")
          .font(.caption)
          .foregroundColor(.secondary)
      } else if let error = model.lastComputeResultLine {
        Image(systemName: "xmark.circle.fill")
          .font(.system(size: 60))
          .foregroundColor(.red)
        Text(error)
          .font(.footnote)
          .multilineTextAlignment(.center)
          .padding()
      }

      if showReport {
        // The DeviceActivityReport triggers the extension to compute
        DeviceActivityReport(.totalActivity)
          .frame(height: 200)
      }
    }
    .padding()
    .onAppear {
      model.requestComputeYesterday()
      // Show report after a brief delay to trigger extension
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        showReport = true
      }
    }
  }
}
