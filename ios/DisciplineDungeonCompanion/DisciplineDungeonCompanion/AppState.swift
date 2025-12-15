import Foundation
import SwiftUI

@MainActor
final class AppState: ObservableObject {
  @AppStorage("dd.webBaseUrl") var webBaseUrl: String = AppConfig.defaultWebBaseUrl
  @AppStorage("dd.timezone") var timezone: String = TimeZone.current.identifier

  @Published var auth = SupabaseAuthService()

  var api: ApiClient {
    ApiClient(baseUrl: webBaseUrl, accessToken: auth.accessToken)
  }
}

enum AppConfig {
  static var supabaseUrl: URL? {
    guard let str = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String else {
      return nil
    }
    guard !str.isEmpty else { return nil }
    return URL(string: str)
  }

  static var supabaseAnonKey: String? {
    guard let str = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String else {
      return nil
    }
    return str.isEmpty ? nil : str
  }

  static var defaultWebBaseUrl: String {
    (Bundle.main.object(forInfoDictionaryKey: "DEFAULT_WEB_BASE_URL") as? String) ?? "http://localhost:3002"
  }
}

enum ScreenTimeSelectionStorage {
  static let key = "dd.familyActivitySelection"
}
