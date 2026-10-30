import ActivityKit
import AppIntents
import Foundation
#if canImport(AlarmKit)
import AlarmKit
#endif

// Compiled into both the app and the RoutineWidget extension.
//
// iOS shows a notification's buttons only on a long-press. A routine cue that
// should show its buttons straight away arrives instead as a Live Activity
// (started by the cron with a push-to-start token, apps/cron/src/utils/push.js)
// or, for a routine set to Alarm, as an AlarmKit alarm the app schedules
// (RoutineAlarms.swift). Both buttons run RoutineButtonIntent, which opens the
// app and hands the button to the web app (RoutineCuesPlugin, pushService.js).

/// A routine's Live Activity. The cron's push-to-start payload must decode
/// into this, key for key: `attributes` and `content-state`.
@available(iOS 16.1, *)
struct RoutineActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var title: String
        var body: String
        /// Which buttons: ROUTINE_ACTIONS, AGENT_START_ACTIONS or AGENT_BUILD_ACTIONS.
        var category: String
    }

    var routineId: String
    var name: String
    var time: String
}

/// The buttons of each category, as planned in Asana "User Experience
/// Notification" (1213751007474214) and registered for notifications in
/// apps/web-app/src/services/notificationRoutes.js ACTION_TYPES.
enum RoutineButtons {
    static func of(_ category: String) -> [(id: String, title: String)] {
        switch category {
        case "AGENT_START_ACTIONS": return [(id: "START_AGENT", title: "Start agent")]
        case "AGENT_BUILD_ACTIONS": return [(id: "BUILD_AGENT", title: "Build agent")]
        default: return [(id: "DO_NOW", title: "Do now"), (id: "COMPLETE", title: "Complete")]
        }
    }
}

/// Where a button tap waits for the web app: the intent runs in the app's
/// process, possibly before the web view has loaded.
enum RoutineCueInbox {
    static let pendingKey = "routineCues.pendingAction"
    static let received = Notification.Name("RoutineCueActionReceived")

    static func deliver(button: String, routineId: String) {
        let action = ["button": button, "routineId": routineId]
        UserDefaults.standard.set(action, forKey: pendingKey)
        NotificationCenter.default.post(name: received, object: nil, userInfo: action)
    }

    /// The waiting action, once.
    static func take() -> [String: String]? {
        guard let action = UserDefaults.standard.dictionary(forKey: pendingKey) as? [String: String] else { return nil }
        UserDefaults.standard.removeObject(forKey: pendingKey)
        return action
    }
}

/// A button on a routine's Live Activity or alarm. Opens the app, like every
/// routine notification button.
@available(iOS 17.0, *)
struct RoutineButtonIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Routine button"
    static var openAppWhenRun: Bool = true
    static var isDiscoverable: Bool = false

    @Parameter(title: "Button")
    var button: String

    @Parameter(title: "Routine")
    var routineId: String

    init() {}

    init(button: String, routineId: String) {
        self.button = button
        self.routineId = routineId
    }

    func perform() async throws -> some IntentResult {
        RoutineCueInbox.deliver(button: button, routineId: routineId)
        // Acted on: the card has done its job.
        for activity in Activity<RoutineActivityAttributes>.activities where activity.attributes.routineId == routineId {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        return .result()
    }
}

#if canImport(AlarmKit)
/// What an alarm remembers about its routine.
@available(iOS 26.0, *)
struct RoutineAlarmMetadata: AlarmMetadata {
    var routineId: String
    var title: String
}
#endif
