import Foundation

enum FeatureFlags {
  static let enforcementEnabled: Bool = {
    #if ENFORCEMENT_ENABLED
    return true
    #else
    return false
    #endif
  }()
}
