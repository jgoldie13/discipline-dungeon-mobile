import Foundation
import Supabase

/// Centralized Supabase authentication manager
/// Provides session management, token retrieval, and auth state observation
@MainActor
final class SupabaseAuthManager: ObservableObject {
  @Published private(set) var isAuthenticated = false
  @Published private(set) var currentUser: User?
  @Published private(set) var lastError: String?

  private let supabase: SupabaseClient

  init() {
    // Load Supabase configuration from environment or settings
    let config = SupabaseConfig.load()

    self.supabase = SupabaseClient(
      supabaseURL: config.url,
      supabaseKey: config.anonKey,
      options: SupabaseClientOptions(
        auth: AuthClientOptions(
          autoRefreshToken: true,
          persistSession: true,
          storage: KeychainAuthStorage() // Secure Keychain storage
        )
      )
    )

    Task {
      await checkInitialSession()
      observeAuthStateChanges()
    }
  }

  /// Check for existing session on initialization
  private func checkInitialSession() async {
    do {
      let session = try await supabase.auth.session
      self.currentUser = session.user
      self.isAuthenticated = true
      print("✓ Existing session found for user: \(session.user.email ?? "unknown")")
    } catch {
      // No existing session or session expired
      self.isAuthenticated = false
      self.currentUser = nil
      print("ℹ️ No existing session found")
    }
  }

  /// Observe auth state changes (sign in, sign out, token refresh)
  private func observeAuthStateChanges() {
    Task {
      for await state in await supabase.auth.authStateChanges {
        switch state.event {
        case .signedIn:
          self.currentUser = state.session?.user
          self.isAuthenticated = true
          self.lastError = nil
          print("✓ User signed in: \(state.session?.user.email ?? "unknown")")

        case .signedOut:
          self.currentUser = nil
          self.isAuthenticated = false
          print("ℹ️ User signed out")

        case .tokenRefreshed:
          print("✓ Token auto-refreshed for user: \(state.session?.user.email ?? "unknown")")

        default:
          break
        }
      }
    }
  }

  /// Sign in with email and password
  func signIn(email: String, password: String) async throws {
    lastError = nil
    do {
      let session = try await supabase.auth.signIn(email: email, password: password)
      self.currentUser = session.user
      self.isAuthenticated = true
      print("✓ Sign-in successful: \(session.user.email ?? "unknown")")
    } catch {
      lastError = "Sign-in failed: \(error.localizedDescription)"
      throw error
    }
  }

  /// Sign out current user
  func signOut() async throws {
    lastError = nil
    do {
      try await supabase.auth.signOut()
      self.currentUser = nil
      self.isAuthenticated = false
      print("✓ Sign-out successful")
    } catch {
      lastError = "Sign-out failed: \(error.localizedDescription)"
      throw error
    }
  }

  /// Get current access token (auto-refreshes if needed)
  /// This is the PRIMARY method for obtaining tokens for API calls
  func getAccessToken() async throws -> String {
    do {
      // This automatically refreshes the token if expired
      let session = try await supabase.auth.session
      let token = session.accessToken

      // Security: Only log last 6 characters for debugging
      let lastChars = String(token.suffix(6))
      print("✓ Access token retrieved (ending in: ...\(lastChars))")

      return token
    } catch {
      lastError = "Failed to get access token: \(error.localizedDescription)"
      throw AuthError.noSession
    }
  }

  /// Get current session (non-refreshing, for quick checks)
  var currentSession: Session? {
    try? supabase.auth.currentSession
  }
}

/// Custom errors for authentication
enum AuthError: LocalizedError {
  case noSession
  case invalidCredentials
  case configurationMissing

  var errorDescription: String? {
    switch self {
    case .noSession:
      return "No active session. Please sign in."
    case .invalidCredentials:
      return "Invalid email or password."
    case .configurationMissing:
      return "Supabase configuration missing. Check settings."
    }
  }
}

/// Supabase configuration (URL + anon key)
struct SupabaseConfig: Codable {
  let url: URL
  let anonKey: String

  static func load() -> SupabaseConfig {
    // Try loading from UserDefaults first
    if let data = UserDefaults.standard.data(forKey: "dd.supabase.config.v1"),
       let config = try? JSONDecoder().decode(SupabaseConfig.self, from: data) {
      return config
    }

    // Fallback to environment variables or hardcoded values
    // In production, these should come from build configuration
    guard let urlString = ProcessInfo.processInfo.environment["SUPABASE_URL"],
          let url = URL(string: urlString),
          let anonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] else {
      fatalError("Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY.")
    }

    return SupabaseConfig(url: url, anonKey: anonKey)
  }

  static func save(_ config: SupabaseConfig) {
    if let data = try? JSONEncoder().encode(config) {
      UserDefaults.standard.set(data, forKey: "dd.supabase.config.v1")
    }
  }
}

/// Secure Keychain storage for auth sessions
/// Supabase SDK uses this instead of UserDefaults for session persistence
final class KeychainAuthStorage: AuthStorage {
  private let serviceName = "com.disciplinedungeon.auth"

  func store(key: String, value: Data) throws {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: serviceName,
      kSecAttrAccount as String: key,
      kSecValueData as String: value
    ]

    // Delete existing item first
    SecItemDelete(query as CFDictionary)

    // Add new item
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else {
      throw KeychainError.storeFailed(status)
    }
  }

  func retrieve(key: String) throws -> Data {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: serviceName,
      kSecAttrAccount as String: key,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    guard status == errSecSuccess, let data = result as? Data else {
      throw KeychainError.retrieveFailed(status)
    }

    return data
  }

  func remove(key: String) throws {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: serviceName,
      kSecAttrAccount as String: key
    ]

    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      throw KeychainError.deleteFailed(status)
    }
  }
}

enum KeychainError: Error {
  case storeFailed(OSStatus)
  case retrieveFailed(OSStatus)
  case deleteFailed(OSStatus)
}
