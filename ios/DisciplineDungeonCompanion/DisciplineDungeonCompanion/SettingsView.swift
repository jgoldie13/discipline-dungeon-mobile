import SwiftUI

struct SettingsView: View {
  @EnvironmentObject var appState: AppState
  @State private var saving = false
  @State private var message: String?

  var body: some View {
    Form {
      Section("Backend") {
        TextField("Web Base URL", text: $appState.webBaseUrl)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
        Text("Example: https://your-vercel-deployment.example.com")
          .font(.footnote)
      }

      Section("Verification") {
        TextField("Timezone (IANA)", text: $appState.timezone)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()

        Button(saving ? "Saving…" : "Save to backend") {
          Task {
            saving = true
            defer { saving = false }
            do {
              let data = try await appState.api.patchIosConnection(enabled: true, timezone: appState.timezone)
              message = String(data: data, encoding: .utf8)
            } catch {
              message = "Error: \(error.localizedDescription)"
            }
          }
        }
        .disabled(saving || appState.auth.accessToken == nil)

        if let message {
          Text(message)
            .font(.footnote)
            .textSelection(.enabled)
        }
      }

      Section("Notes") {
        Text("If Screen Time authorization fails, ensure you enabled the required capabilities in Xcode (Family Controls, Device Activity, Managed Settings).")
          .font(.footnote)
      }
    }
    .navigationTitle("Settings")
  }
}

