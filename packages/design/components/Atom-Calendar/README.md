# Calendar

AtomCalendar - Atomic wrapper for Vuetify v-calendar A component for displaying a calendar with various views (month, week, day) and event support. Passes all attributes, events, and scoped slots to the underlying v-calendar. @example <atom-calendar v-model="selectedDate" type="month" color="primary" @click:date="handleDateClick" > <template v-slot:day="{ date }"> {{ date }} </template> </atom-calendar>

- Level: Atom · source `packages/ui/atoms/Calendar/Calendar.vue`
- Used by: `packages/ui/molecules/DateSelector/DateSelector.vue`, `packages/ui/organisms/UserHistory/UserHistory.vue`
- Stories shown: Month, Week

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
