import SwiftUI
import FamilyControls
import ManagedSettings
import DeviceActivity

struct ScreenTimeView: View {
  @State private var authorizationStatus = AuthorizationCenter.shared.authorizationStatus
  @State private var selection = FamilyActivitySelection()
  @State private var showingPicker = false

  var body: some View {
    Form {
      Section("Authorization") {
        Text("Status: \(String(describing: authorizationStatus))")
        Button("Request Screen Time Authorization") {
          Task {
            do {
              try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            } catch {
              // Runtime-only error handling; entitlement/capability required to actually succeed.
            }
            authorizationStatus = AuthorizationCenter.shared.authorizationStatus
          }
        }
      }

      Section("Selection") {
        Button("Choose apps/categories") { showingPicker = true }
        Text("Selection will be included in upload payload as raw metadata.")
          .font(.footnote)
        Text("Saved locally: \(UserDefaults.standard.data(forKey: ScreenTimeSelectionStorage.key) != nil ? "Yes" : "No")")
          .font(.footnote)
      }

      Section("Notes") {
        Text("This scaffold does not compute real Screen Time minutes yet. See docs/ios-companion.md for the report extension design.")
          .font(.footnote)
      }
    }
    .navigationTitle("Screen Time")
    .familyActivityPicker(isPresented: $showingPicker, selection: $selection)
    .onAppear {
      if let data = UserDefaults.standard.data(forKey: ScreenTimeSelectionStorage.key) {
        if let decoded = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
          selection = decoded
        }
      }
    }
    .onChange(of: selection) { _, newValue in
      if let data = try? JSONEncoder().encode(newValue) {
        UserDefaults.standard.set(data, forKey: ScreenTimeSelectionStorage.key)
      }
    }
  }
}
