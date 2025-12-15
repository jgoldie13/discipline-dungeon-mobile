import SwiftUI

struct RootView: View {
  @EnvironmentObject var appState: AppState

  var body: some View {
    TabView {
      NavigationStack {
        AuthView()
      }
      .tabItem { Label("Sign In", systemImage: "person.fill") }

      NavigationStack {
        ScreenTimeView()
      }
      .tabItem { Label("Screen Time", systemImage: "hourglass") }

      NavigationStack {
        UploadView()
      }
      .tabItem { Label("Upload", systemImage: "arrow.up.circle") }

      NavigationStack {
        SettingsView()
      }
      .tabItem { Label("Settings", systemImage: "gearshape") }
    }
  }
}

