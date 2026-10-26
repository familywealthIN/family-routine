# Routine chat

Every routine has its own thread under the checklist: event pills, the routine's replies, the user's bubbles, proposal cards and follow-up chips, above a sticky composer.

- **Bubbles** 14/400, line-height 1.4, max 86% wide, padding 8/12. The routine: `bubble-routine` (#f1f3f5) with a 4 px bottom-left corner. The user: `primary` with white text and a 4 px bottom-right corner.
- **Post-tick insight**: the same shape lifted with `primary-tint-soft` and a 1 px 18% primary border, a 15/700 title with a `bolt` icon. Three sentences: a true win, one idea for the next session, something to look forward to. Once per routine per day.
- **Event pill**: centred, 11/600, radius 999, tinted by tone ("Deep Work ticked at 09:12 · D +10").
- **Proposals**: when the routine suggests tasks it lists them with `add_circle_outline` and one primary pill, "Add all to checklist". Nothing is added until the user taps it or says "add them". **A question is never an add.**
- **Chips**: 30 px outline pills (`primary-dark` on white, 45% primary border, 12/600). The last reply's follow-ups lead, then "Add a task"; the defaults are "What did I do last time?", "Plan from next steps", "How was my week?".
- Every answer ends by handing the conversation back with one question or offer.
- The composer is a white pill with `shadow-card`, level with the card above it. On phone, focusing it collapses the brief and the checklist and hides the tab bar so the input sits on the keyboard.

Source: `organisms/RoutineChatThread`, `organisms/RoutineComposer`, `organisms/RoutineBriefCard`, `apps/web-app/src/containers/RoutineChatContainer.vue`.
