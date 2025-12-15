import Foundation
import Security

enum KeychainStore {
  static func get(_ key: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "DisciplineDungeonCompanion",
      kSecAttrAccount as String: key,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess else { return nil }
    guard let data = item as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  static func set(_ value: String, for key: String) {
    let data = Data(value.utf8)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "DisciplineDungeonCompanion",
      kSecAttrAccount as String: key,
    ]

    let update: [String: Any] = [kSecValueData as String: data]
    let status = SecItemUpdate(query as CFDictionary, update as CFDictionary)
    if status == errSecItemNotFound {
      var insert = query
      insert[kSecValueData as String] = data
      _ = SecItemAdd(insert as CFDictionary, nil)
    }
  }

  static func delete(_ key: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "DisciplineDungeonCompanion",
      kSecAttrAccount as String: key,
    ]
    _ = SecItemDelete(query as CFDictionary)
  }
}

