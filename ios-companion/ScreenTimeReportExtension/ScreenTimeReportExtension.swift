import DeviceActivity
import SwiftUI

@main
struct DisciplineDungeonScreenTimeReportExtension: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
      YesterdayTotalReport { results in
        YesterdayTotalView(results: results)
      }

  }
}

