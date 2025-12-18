import DeviceActivity
import SwiftUI

@main
struct ScreenTimeReportExtension: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    TotalActivityReport { totalActivity in
      TotalActivityView(activityReport: totalActivity)
    }
  }
}
