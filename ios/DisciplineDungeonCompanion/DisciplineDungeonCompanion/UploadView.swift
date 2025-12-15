import SwiftUI
import UIKit

struct UploadView: View {
  @EnvironmentObject var appState: AppState

  @State private var date = Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date()
  @State private var verifiedMinutesStub = 0
  @State private var loading = false
  @State private var responseText: String?

  private func dateOnlyString(_ d: Date) -> String {
    let cal = Calendar(identifier: .gregorian)
    let comps = cal.dateComponents(in: TimeZone.current, from: d)
    let y = comps.year ?? 1970
    let m = comps.month ?? 1
    let day = comps.day ?? 1
    return String(format: "%04d-%02d-%02d", y, m, day)
  }

  var body: some View {
    Form {
      Section("Upload") {
        if appState.auth.accessToken == nil {
          Text("Sign in first.")
        }

        DatePicker("Date", selection: $date, displayedComponents: .date)
        Stepper(value: $verifiedMinutesStub, in: 0...24 * 60) {
          Text("Verified minutes (TODO): \(verifiedMinutesStub)")
        }
        Text("This is a placeholder. Real Screen Time minutes must be computed via a DeviceActivity report extension.")
          .font(.footnote)

        Button(loading ? "Uploading…" : "Upload") {
          Task {
            loading = true
            defer { loading = false }
            do {
              let dateStr = dateOnlyString(date)
              let selectionBase64 = UserDefaults.standard.data(forKey: ScreenTimeSelectionStorage.key)?.base64EncodedString()
              var raw: [String: Any] = [
                "device": UIDevice.current.model,
                "systemVersion": UIDevice.current.systemVersion,
                "build": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown",
              ]
              if let selectionBase64 {
                raw["selectionBase64"] = selectionBase64
              }
              let data = try await appState.api.upload(date: dateStr, verifiedMinutes: verifiedMinutesStub, raw: raw)
              responseText = String(data: data, encoding: .utf8)
            } catch {
              responseText = "Error: \(error.localizedDescription)"
            }
          }
        }
        .disabled(loading || appState.auth.accessToken == nil)
      }

      if let responseText {
        Section("Response") {
          Text(responseText)
            .font(.footnote)
            .textSelection(.enabled)
        }
      }
    }
    .navigationTitle("Upload")
  }
}
