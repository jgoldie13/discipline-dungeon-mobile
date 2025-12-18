import DeviceActivity
import SwiftUI

@main
struct DisciplineDungeonScreenTimeReportExtension: DeviceActivityReportExtension {
  init() {
    let groupID = "group.com.disciplinedungeon.shared"
    let d = UserDefaults(suiteName: groupID)
    d?.set(Date().timeIntervalSince1970, forKey: "dd_ext_loaded_ts")
    d?.set("extension init()", forKey: "dd_ext_loaded_note")
  }

  var body: some DeviceActivityReportScene {
    YesterdayTotalReport { configuration in
      YesterdayTotalView(configuration: configuration)
    }
  }
}
