import SwiftUI

@main
struct DisciplineDungeonIOSCompanionApp: App {
  @StateObject private var model = CompanionModel()

  var body: some Scene {
    WindowGroup {
      ContentView(model: model)
    }
  }
}

