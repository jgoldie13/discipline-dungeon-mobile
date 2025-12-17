import DeviceActivity
import SwiftUI

@main
struct DisciplineDungeonScreenTimeReportExtension: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    YesterdayTotalReport { configuration in
      YesterdayTotalView(configuration: configuration)
    }
  }
}
