import SwiftUI

@main
struct DisciplineDungeonCompanionApp: App {
  @StateObject private var appState = AppState()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(appState)
    }
  }
}

