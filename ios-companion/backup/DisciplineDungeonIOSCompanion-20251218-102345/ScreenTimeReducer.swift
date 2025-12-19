import Foundation

enum ScreenTimeReducer {
  static func verifiedMinutes(totalSeconds: TimeInterval) -> Int {
    if totalSeconds.isNaN || totalSeconds.isInfinite { return 0 }
    if totalSeconds <= 0 { return 0 }
    return Int(totalSeconds) / 60
  }
}

