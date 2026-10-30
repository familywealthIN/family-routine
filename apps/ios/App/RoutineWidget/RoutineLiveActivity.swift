import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit
#if canImport(AlarmKit)
import AlarmKit
#endif

// Colours from packages/ui's design tokens.
private let primary = Color(red: 0x28 / 255, green: 0x8b / 255, blue: 0xd5 / 255) // --primary
private let controlRadius: CGFloat = 12 // --radius-control

/// Opens the routine when the card itself (not a button) is tapped.
private func routineURL(_ routineId: String) -> URL? {
    var parts = URLComponents()
    parts.scheme = "routinenotes"
    parts.host = "routine"
    parts.queryItems = [URLQueryItem(name: "routineId", value: routineId)]
    return parts.url
}

/// The routine's buttons: the first filled, any second outlined.
@available(iOS 17.0, *)
struct RoutineButtonRow: View {
    let routineId: String
    let category: String

    var body: some View {
        HStack(spacing: 8) {
            ForEach(Array(RoutineButtons.of(category).enumerated()), id: \.offset) { index, button in
                Button(intent: RoutineButtonIntent(button: button.id, routineId: routineId)) {
                    Text(button.title)
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .foregroundStyle(index == 0 ? Color.white : primary)
                        .background(
                            RoundedRectangle(cornerRadius: controlRadius)
                                .fill(index == 0 ? primary : primary.opacity(0.14))
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

@available(iOS 17.0, *)
struct RoutineCard: View {
    let context: ActivityViewContext<RoutineActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(primary)
                Text(context.attributes.name)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text(context.attributes.time)
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(context.state.title)
                    .font(.headline)
                    .lineLimit(1)
                Text(context.state.body)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            RoutineButtonRow(routineId: context.attributes.routineId, category: context.state.category)
        }
        .padding(16)
    }
}

/// A routine cue on the lock screen and in the Dynamic Island, with its
/// buttons showing: no long-press needed.
struct RoutineLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RoutineActivityAttributes.self) { context in
            RoutineCard(context: context)
                .widgetURL(routineURL(context.attributes.routineId))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(context.attributes.name).lineLimit(1)
                    } icon: {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(primary)
                    }
                    .font(.subheadline.weight(.semibold))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.time)
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(context.state.title)
                            .font(.subheadline)
                            .lineLimit(1)
                        RoutineButtonRow(routineId: context.attributes.routineId, category: context.state.category)
                    }
                }
            } compactLeading: {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(primary)
            } compactTrailing: {
                Text(context.attributes.time)
                    .font(.caption.monospacedDigit())
            } minimal: {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(primary)
            }
            .widgetURL(routineURL(context.attributes.routineId))
            .keylineTint(primary)
        }
    }
}

#if canImport(AlarmKit)
/// AlarmKit draws the ringing alarm itself; this is the card it shows around
/// it (lock screen, Dynamic Island, StandBy).
@available(iOS 26.0, *)
struct RoutineAlarmActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AlarmAttributes<RoutineAlarmMetadata>.self) { context in
            HStack(spacing: 8) {
                Image(systemName: "alarm.fill")
                    .foregroundStyle(primary)
                Text(context.attributes.metadata?.title ?? "Routine")
                    .font(.headline)
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .padding(16)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "alarm.fill").foregroundStyle(primary)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.metadata?.title ?? "Routine").lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "alarm.fill").foregroundStyle(primary)
            } compactTrailing: {
                EmptyView()
            } minimal: {
                Image(systemName: "alarm.fill").foregroundStyle(primary)
            }
        }
    }
}
#endif
