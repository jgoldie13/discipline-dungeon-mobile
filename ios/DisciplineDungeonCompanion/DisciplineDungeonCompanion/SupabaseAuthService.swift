import Foundation
import SwiftUI
import Supabase

@MainActor
final class SupabaseAuthService: ObservableObject {
  @Published private(set) var userId: String?
  @Published private(set) var accessToken: String?
  @Published var statusMessage: String?

  private var client: SupabaseClient? {
    guard let url = AppConfig.supabaseUrl, let anonKey = AppConfig.supabaseAnonKey else {
      return nil
    }
    return SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
  }

  init() {
    let token = KeychainStore.get("supabaseAccessToken")
    self.accessToken = token
  }

  func signIn(email: String, password: String) async {
    statusMessage = nil
    guard let client else {
      statusMessage = "Missing SUPABASE_URL / SUPABASE_ANON_KEY in Info.plist."
      return
    }

    do {
      // API shape may vary slightly across supabase-swift versions.
      // If this doesn't compile on upgrade, update to the latest documented sign-in method.
      let session = try await client.auth.signIn(email: email, password: password)
      KeychainStore.set(session.accessToken, for: "supabaseAccessToken")
      accessToken = session.accessToken
      userId = session.user.id.uuidString
      statusMessage = "Signed in."
    } catch {
      statusMessage = "Sign-in failed: \(error.localizedDescription)"
    }
  }

  func signOut() {
    userId = nil
    accessToken = nil
    KeychainStore.delete("supabaseAccessToken")
    statusMessage = "Signed out."
  }
}

