import Foundation
import Capacitor
import ActivityKit

/// The web app's side of routine Live Activities and alarms
/// (apps/web-app/src/services/routineCues.js):
///
/// - `status`: whether this iPhone can show Live Activities (iOS 17.2+, turned
///   on) and its push-to-start token, and whether alarms are allowed (iOS 26+).
/// - `endLiveActivities`: clear routine cards once the app is open.
/// - `requestAlarmAuthorization`, `syncAlarms`: AlarmKit alarms for routines
///   set to Alarm, replacing whatever was scheduled before.
/// - events `action` (a card or alarm button, or a tap on the card) and
///   `liveActivityToken` (the push-to-start token, also when it changes).
@objc(RoutineCuesPlugin)
public class RoutineCuesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RoutineCuesPlugin"
    public let jsName = "RoutineCues"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endLiveActivities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAlarmAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncAlarms", returnType: CAPPluginReturnPromise),
    ]

    static let urlScheme = "routinenotes"
    private var startToken: String?

    override public func load() {
        NotificationCenter.default.addObserver(
            self, selector: #selector(onAction(_:)), name: RoutineCueInbox.received, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(onOpenURL(_:)), name: .capacitorOpenURL, object: nil)
        deliverPending()
        // A tap on the card that launched the app came before this loaded.
        if let url = ApplicationDelegateProxy.shared.lastURL { open(url) }
        if #available(iOS 17.2, *) {
            watchStartTokens()
            watchNewActivities()
        }
    }

    // MARK: Button taps

    @objc private func onAction(_ notification: Notification) {
        deliverPending()
    }

    private func deliverPending() {
        guard let action = RoutineCueInbox.take() else { return }
        notifyListeners("action", data: action, retainUntilConsumed: true)
    }

    /// A tap on the card itself: routinenotes://routine?routineId=…
    @objc private func onOpenURL(_ notification: Notification) {
        guard let object = notification.object as? [String: Any],
              let url = object["url"] as? URL else { return }
        open(url)
    }

    private func open(_ url: URL) {
        guard url.scheme == RoutineCuesPlugin.urlScheme,
              let routineId = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "routineId" })?.value
        else { return }
        notifyListeners("action", data: ["button": "tap", "routineId": routineId], retainUntilConsumed: true)
    }

    // MARK: Live Activities

    @available(iOS 17.2, *)
    private func watchStartTokens() {
        Task { [weak self] in
            for await data in Activity<RoutineActivityAttributes>.pushToStartTokenUpdates {
                let token = data.map { String(format: "%02x", $0) }.joined()
                self?.startToken = token
                self?.notifyListeners("liveActivityToken", data: ["token": token], retainUntilConsumed: true)
            }
        }
    }

    /// The cron starts a new card for every cue; keep only the newest, so the
    /// lock screen never piles up a day's worth of them. Every card goes stale
    /// a fixed time after it started, so the latest stale date is the newest.
    @available(iOS 17.2, *)
    private func watchNewActivities() {
        Task {
            for await _ in Activity<RoutineActivityAttributes>.activityUpdates {
                let cards = Activity<RoutineActivityAttributes>.activities
                let newest = cards.max { ($0.content.staleDate ?? .distantPast) < ($1.content.staleDate ?? .distantPast) }
                for card in cards where card.id != newest?.id {
                    await card.end(nil, dismissalPolicy: .immediate)
                }
            }
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        var result: [String: Any] = ["liveActivities": false, "alarms": "unsupported"]
        if #available(iOS 17.2, *) {
            result["liveActivities"] = ActivityAuthorizationInfo().areActivitiesEnabled
            if let token = startToken { result["startToken"] = token }
        }
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            result["alarms"] = RoutineAlarms.authorization()
        }
        #endif
        call.resolve(result)
    }

    @objc func endLiveActivities(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        Task {
            for activity in Activity<RoutineActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }

    // MARK: Alarms

    @objc func requestAlarmAuthorization(_ call: CAPPluginCall) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task { call.resolve(["alarms": await RoutineAlarms.requestAuthorization()]) }
            return
        }
        #endif
        call.resolve(["alarms": "unsupported"])
    }

    /// Replace every scheduled alarm with `alarms`: [{fireAt (ISO 8601),
    /// title, routineId, button, buttonTitle}], as deviceAlarms plans them.
    @objc func syncAlarms(_ call: CAPPluginCall) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            let plans = (call.getArray("alarms", JSObject.self) ?? []).compactMap(RoutineAlarms.Plan.init)
            Task {
                do {
                    call.resolve(["scheduled": try await RoutineAlarms.replaceAll(with: plans)])
                } catch {
                    call.reject("Could not schedule alarms", nil, error)
                }
            }
            return
        }
        #endif
        call.unavailable("Alarms need iOS 26")
    }
}
