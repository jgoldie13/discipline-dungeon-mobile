import DeviceActivity
import FamilyControls
import SwiftUI

struct ContentView: View {
  @ObservedObject var model: CompanionModel

  @State private var isShowingReport = false
  @State private var didDebugAppGroup = false

  var body: some View {
    TabView {
      setupTab
        .tabItem { Label("Setup", systemImage: "gearshape") }
      selectionTab
        .tabItem { Label("Selection", systemImage: "checklist") }
      yesterdayTab
        .tabItem { Label("Yesterday", systemImage: "clock") }
    }
    .task {
      await model.refreshAuthorizationStatus()

      if !didDebugAppGroup {
        didDebugAppGroup = true
        debugAppGroup()
      }
    }
  }

  private func debugAppGroup() {
    let groupID = "group.com.disciplinedungeon.shared"
    print("APP containerURL:", FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) as Any)
    let defaults = UserDefaults(suiteName: groupID)
    defaults?.set("ping", forKey: "dd_test")
    print("APP readBack:", defaults?.string(forKey: "dd_test") as Any)

    let loadedTs = defaults?.double(forKey: "dd_ext_loaded_ts") ?? 0
    let loadedNote = defaults?.string(forKey: "dd_ext_loaded_note")
    print("APP sees EXT loaded ts:", loadedTs, "note:", loadedNote as Any)

    let mcTs = defaults?.double(forKey: "dd_ext_makeconfig_ts") ?? 0
    let mcNote = defaults?.string(forKey: "dd_ext_makeconfig_note")
    print("APP sees EXT makeConfiguration ts:", mcTs, "note:", mcNote as Any)

    let lastTs = defaults?.double(forKey: "dd_last_ext_run_ts") ?? 0
    let note = defaults?.string(forKey: "dd_last_ext_run_note")
    print("APP sees last EXT run ts:", lastTs, "note:", note as Any)
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

#if DEBUG
      Section("Debug") {
        Button("Re-check App Group") { debugAppGroup() }
      }
#endif
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
      Section("Compute") {
        Text("Target date: \(model.yesterdayDateString)")
          .font(.footnote)
        Button("Compute yesterday minutes") {
          model.stageYesterdayComputationRequest()
          isShowingReport = true
        }
      }

      Section("Latest computed") {
        if let snap = model.lastComputedSnapshot {
          Text("\(snap.verifiedMinutes) minutes for \(snap.date) (\(snap.timezone))")
            .font(.headline)
          Text("Computed at: \(snap.computedAt.formatted())")
            .font(.footnote)
        } else {
          Text("No computed value yet. Tap “Compute yesterday minutes”.")
            .font(.footnote)
        }
        TextField("Manual verified minutes (fallback)", text: $model.manualVerifiedMinutesOverride)
          .keyboardType(.numberPad)
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
        VStack(spacing: 12) {
          Text("Computing Screen Time…")
            .font(.headline)
          Text("Leave this open for a moment; the report extension will persist the aggregate to the app group.")
            .font(.footnote)
            .multilineTextAlignment(.center)
            .padding(.horizontal)

          if let filter = model.makeYesterdayFilter() {
            DeviceActivityReport(.ddYesterdayTotal, filter: filter)
              .frame(maxHeight: 320)
          } else {
            Text("Missing selection or timezone.")
              .font(.footnote)
          }

          Spacer()
        }
        .padding()
        .navigationTitle("Yesterday Report")
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Button("Done") { isShowingReport = false }
          }
        }
      }
      .onDisappear {
        model.refreshLastComputedSnapshot()
#if DEBUG
        debugAppGroup()
#endif
      }
    }
  }
}

extension DeviceActivityReport.Context {
  static let ddYesterdayTotal = Self("dd_yesterday_total")
}
