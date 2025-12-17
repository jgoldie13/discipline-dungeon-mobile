import XCTest

@testable import DisciplineDungeonIOSCompanion

final class ScreenTimeReducerTests: XCTestCase {
  func testVerifiedMinutesFloorsSecondsToMinutes() {
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: 0), 0)
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: 1), 0)
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: 59), 0)
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: 60), 1)
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: 61), 1)
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: 119), 1)
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: 120), 2)
  }

  func testVerifiedMinutesHandlesInvalidNumbers() {
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: .nan), 0)
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: .infinity), 0)
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: -.infinity), 0)
    XCTAssertEqual(ScreenTimeReducer.verifiedMinutes(totalSeconds: -10), 0)
  }
}
