import Darwin
import Foundation

enum DebuggerStatus {
  static var isAttached: Bool {
    var info = kinfo_proc()
    var size = MemoryLayout<kinfo_proc>.stride
    var mib = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]

    let result = mib.withUnsafeMutableBufferPointer { buffer in
      sysctl(buffer.baseAddress, u_int(buffer.count), &info, &size, nil, 0)
    }

    if result != 0 {
      return false
    }

    return (info.kp_proc.p_flag & P_TRACED) != 0
  }
}
