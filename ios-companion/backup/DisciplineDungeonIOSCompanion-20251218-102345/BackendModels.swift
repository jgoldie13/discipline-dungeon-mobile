import Foundation

struct IosConnectionPatchBody: Codable {
  let enabled: Bool
  let timezone: String
  let selection: IosSelectionPayload?
}

struct IosConnectionGetResponse: Codable {
  let enabled: Bool
  let timezone: String
  let lastSyncAt: String?
  let selection: IosSelectionPayload?
}

struct IosUploadBody: Codable {
  let date: String
  let verifiedMinutes: Int
  let raw: IosUploadRawPayload?
}

struct IosUploadRawPayload: Codable {
  let source: String
  let timezone: String
  let selection: IosSelectionPayload?
  let computedAtISO8601: String
}

struct IosUploadResponse: Codable {
  let date: String
  let status: String
  let deltaMinutes: Int?
}
