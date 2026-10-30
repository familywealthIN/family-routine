#if canImport(AlarmKit)
import Foundation
import SwiftUI
import AlarmKit
import Capacitor

/// AlarmKit alarms for routines set to Alarm (iOS 26+): they ring like the
/// Clock app, even on silent, with Stop and the routine's one button. The
/// server plans them (deviceAlarms, apps/server/src/utils/deviceAlarms.js);
/// this only schedules what it is given.
@available(iOS 26.0, *)
enum RoutineAlarms {
    struct Plan {
        let fireAt: Date
        let title: String
        let routineId: String
        let button: String
        let buttonTitle: String

        init?(_ json: JSObject) {
            guard let fireAt = (json["fireAt"] as? String).flatMap(Plan.date),
                  let title = json["title"] as? String,
                  let routineId = json["routineId"] as? String,
                  let button = json["button"] as? String,
                  let buttonTitle = json["buttonTitle"] as? String
            else { return nil }
            self.fireAt = fireAt
            self.title = title
            self.routineId = routineId
            self.button = button
            self.buttonTitle = buttonTitle
        }

        private static func date(_ text: String) -> Date? {
            let withFraction = ISO8601DateFormatter()
            withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return withFraction.date(from: text) ?? ISO8601DateFormatter().date(from: text)
        }

        var symbol: String {
            switch button {
            case "START_AGENT", "BUILD_AGENT": return "sparkles"
            default: return "play.fill"
            }
        }
    }

    // --primary in packages/ui (#288bd5).
    private static let tint = Color(red: 0x28 / 255, green: 0x8b / 255, blue: 0xd5 / 255)

    static func authorization() -> String {
        name(AlarmManager.shared.authorizationState)
    }

    static func requestAuthorization() async -> String {
        do {
            return name(try await AlarmManager.shared.requestAuthorization())
        } catch {
            return authorization()
        }
    }

    private static func name(_ state: AlarmManager.AuthorizationState) -> String {
        switch state {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .notDetermined: return "notDetermined"
        @unknown default: return "denied"
        }
    }

    /// Cancel every alarm this app has, then schedule `plans`. Returns how
    /// many were scheduled.
    static func replaceAll(with plans: [Plan]) async throws -> Int {
        let manager = AlarmManager.shared
        guard manager.authorizationState == .authorized else { return 0 }
        for alarm in try manager.alarms {
            try? manager.cancel(id: alarm.id)
        }
        var scheduled = 0
        for plan in plans where plan.fireAt > Date() {
            let alert = AlarmPresentation.Alert(
                title: LocalizedStringResource(stringLiteral: plan.title),
                stopButton: AlarmButton(text: "Stop", textColor: .white, systemImageName: "stop.fill"),
                secondaryButton: AlarmButton(
                    text: LocalizedStringResource(stringLiteral: plan.buttonTitle),
                    textColor: .white,
                    systemImageName: plan.symbol
                ),
                secondaryButtonBehavior: .custom
            )
            let attributes = AlarmAttributes<RoutineAlarmMetadata>(
                presentation: AlarmPresentation(alert: alert),
                metadata: RoutineAlarmMetadata(routineId: plan.routineId, title: plan.title),
                tintColor: tint
            )
            let configuration = AlarmManager.AlarmConfiguration<RoutineAlarmMetadata>.alarm(
                schedule: .fixed(plan.fireAt),
                attributes: attributes,
                secondaryIntent: RoutineButtonIntent(button: plan.button, routineId: plan.routineId),
                sound: .default
            )
            _ = try await manager.schedule(id: UUID(), configuration: configuration)
            scheduled += 1
        }
        return scheduled
    }
}
#endif
