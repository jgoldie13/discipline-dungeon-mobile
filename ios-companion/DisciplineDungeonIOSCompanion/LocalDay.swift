import Foundation

enum LocalDay {
  static func yesterdayDateString(timeZoneId: String, now: Date = Date()) -> String {
    let tz = TimeZone(identifier: timeZoneId) ?? .current
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = tz

    let startOfToday = cal.startOfDay(for: now)
    let startOfYesterday = cal.date(byAdding: .day, value: -1, to: startOfToday) ?? startOfToday

    let comps = cal.dateComponents([.year, .month, .day], from: startOfYesterday)
    let y = comps.year ?? 1970
    let m = comps.month ?? 1
    let d = comps.day ?? 1
    return String(format: "%04d-%02d-%02d", y, m, d)
  }

  static func yesterdayDateInterval(timeZoneId: String, now: Date = Date()) -> DateInterval {
    let tz = TimeZone(identifier: timeZoneId) ?? .current
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = tz

    let startOfToday = cal.startOfDay(for: now)
    let startOfYesterday = cal.date(byAdding: .day, value: -1, to: startOfToday) ?? startOfToday
    return DateInterval(start: startOfYesterday, end: startOfToday)
  }
}

