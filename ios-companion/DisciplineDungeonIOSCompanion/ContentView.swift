import DeviceActivity
import FamilyControls
import SwiftUI

struct ContentView: View {
  @ObservedObject var model: CompanionModel

  @State private var isShowingReport = false

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
          Text("Leave this open for 5-10 seconds")
            .font(.footnote)
            .foregroundColor(.secondary)

          if let filter = model.makeYesterdayFilter() {
            DeviceActivityReport(.totalActivity, filter: filter)
              .frame(height: 200)
          } else {
            Text("Missing selection or timezone")
              .font(.footnote)
              .foregroundColor(.red)
          }

          Spacer()
        }
        .padding()
        .navigationTitle("Yesterday Report")
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Button("Done") {
              isShowingReport = false
              model.refreshComputedValue()
            }
          }
        }
      }
    }
  }
}

extension DeviceActivityReport.Context {
  static let totalActivity = Self("Total Activity")
}
