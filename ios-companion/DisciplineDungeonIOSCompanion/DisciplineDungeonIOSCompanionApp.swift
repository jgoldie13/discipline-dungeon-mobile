import SwiftUI

@main
struct DisciplineDungeonIOSCompanionApp: App {
  @StateObject private var authManager: SupabaseAuthManager
  @StateObject private var model: CompanionModel

  init() {
    let authManager = SupabaseAuthManager()
    _authManager = StateObject(wrappedValue: authManager)
    _model = StateObject(wrappedValue: CompanionModel(authManager: authManager))
  }

  var body: some Scene {
    WindowGroup {
      ContentView(model: model)
        .environmentObject(authManager)
    }
  }
}
