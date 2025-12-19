import Foundation

enum ApiClientError: Error {
  case invalidBaseURL
  case invalidResponse
  case httpError(status: Int, body: String?)
}

enum ApiClient {
  static func endpointURL(baseURLString: String, path: String) throws -> URL {
    guard var comps = URLComponents(string: baseURLString) else { throw ApiClientError.invalidBaseURL }
    comps.path = comps.path.replacingOccurrences(of: "/$", with: "", options: .regularExpression) + path
    guard let url = comps.url else { throw ApiClientError.invalidBaseURL }
    return url
  }

  static func patch<T: Encodable, U: Decodable>(url: URL, accessToken: String, body: T) async throws -> U {
    try await request(url: url, method: "PATCH", accessToken: accessToken, body: body, responseType: U.self)
  }

  static func post<T: Encodable, U: Decodable>(url: URL, accessToken: String, body: T, responseType: U.Type) async throws -> U {
    try await request(url: url, method: "POST", accessToken: accessToken, body: body, responseType: responseType)
  }

  private static func request<T: Encodable, U: Decodable>(
    url: URL,
    method: String,
    accessToken: String,
    body: T,
    responseType: U.Type
  ) async throws -> U {
    var req = URLRequest(url: url)
    req.httpMethod = method
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

    req.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: req)
    guard let http = response as? HTTPURLResponse else { throw ApiClientError.invalidResponse }
    if http.statusCode < 200 || http.statusCode >= 300 {
      let bodyStr = String(data: data, encoding: .utf8)
      throw ApiClientError.httpError(status: http.statusCode, body: bodyStr)
    }
    return try JSONDecoder().decode(U.self, from: data)
  }
}

