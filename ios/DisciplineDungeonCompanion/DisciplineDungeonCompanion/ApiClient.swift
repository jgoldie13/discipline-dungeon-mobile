import Foundation

struct ApiClient {
  let baseUrl: String
  let accessToken: String?

  func patchIosConnection(enabled: Bool, timezone: String) async throws -> Data {
    let url = URL(string: baseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/api/verification/ios/connection")!
    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("no-cache, no-store, must-revalidate", forHTTPHeaderField: "Cache-Control")
    if let accessToken {
      request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    }
    request.httpBody = try JSONSerialization.data(withJSONObject: [
      "enabled": enabled,
      "timezone": timezone,
    ])

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
      throw NSError(domain: "ApiClient", code: 1, userInfo: [NSLocalizedDescriptionKey: "Connection PATCH failed"])
    }
    return data
  }

  func upload(date: String, verifiedMinutes: Int, raw: [String: Any]) async throws -> Data {
    guard let accessToken else {
      throw NSError(domain: "ApiClient", code: 2, userInfo: [NSLocalizedDescriptionKey: "Not signed in"])
    }

    let url = URL(string: baseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/api/verification/ios/upload")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("no-cache, no-store, must-revalidate", forHTTPHeaderField: "Cache-Control")
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

    request.httpBody = try JSONSerialization.data(withJSONObject: [
      "date": date,
      "verifiedMinutes": verifiedMinutes,
      "raw": raw,
    ])

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
      let message = String(data: data, encoding: .utf8) ?? "Upload failed"
      throw NSError(domain: "ApiClient", code: 3, userInfo: [NSLocalizedDescriptionKey: message])
    }
    return data
  }
}

