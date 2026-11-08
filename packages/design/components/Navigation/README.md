# Navigation

One navigation model on every device: four primary destinations, and everything else under More.

- **Primary**: Home (`home`) · Priority (`dashboard`) · Agents (`smart_toy`) · Goals (`assignment`). The Goals icon carries a small ring showing the average year-goal progress.
- **More**: Routines · Progress · Groups, then (8 px gap) Profile · About.
- **Phone**: a 64 px white bottom bar (plus the home-indicator inset), 24 px icons over 12/500 labels, active `primary`. More lives in the avatar drawer (300 px, opens from the right) under the user's name and D/K/G rings. The bar hides while the chat composer has focus.
- **iPad**: a 76 px rail; items are a 52×30 pill over a 10/600 label, active pill `primary-tint`. A More toggle (`more_horiz` / `expand_less`) opens the rest.
- **Desktop**: a 264 px sidebar; rows 40 px, radius 10, 14/600, active row `primary-tint` with `primary-dark` text. "More ⌄" expands in place, open by default when the current page is under More. Content is capped at 980 px on Home and 1040 px elsewhere.
- Shell rule (the only breakpoint scheme): phone below Vuetify `sm`, desktop at 1264 px and up, tablet between.

Source: `organisms/AppShell`, `organisms/UserDrawer`, `constants/navigation.js`, `docs/redesign/chassis.md`.
