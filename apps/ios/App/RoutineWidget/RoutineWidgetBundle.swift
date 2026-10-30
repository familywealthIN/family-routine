import WidgetKit
import SwiftUI

@main
struct RoutineWidgetBundle: WidgetBundle {
    var body: some Widget {
        RoutineLiveActivity()
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            RoutineAlarmActivity()
        }
        #endif
    }
}
