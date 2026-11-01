# Focus card

The heart of Home: the current routine's tick ring and title, its checklist, and the Today · Week · Month · Year tabs that open the goal cascade.

- **Tick ring**: 120 px on phone (104 on iPad and desktop), inset 10, centre glyph 32 px. Orange (`now`) while the routine's window is open, blue otherwise, green once ticked. On phone the ticked ring flies into the header centre (`rn-fly`), then pops (`rn-pop`). Tapping an unticked routine opens the Start sheet; it never ticks straight through.
- **Agent lifecycle** shows on the ring itself, not as a text badge: waiting and running breathe (`rn-breathe` 1.8 s), listening is amber and still, firing pulses fast (1 s), finished is green, failed red, stalled orange and static.
- **Title** 19/700 on phone (26 on iPad and desktop), line-height 1.3 so descenders are never clipped; meta line is the window time plus the `NOW` badge.
- **Checklist**: a 12/700 "CHECKLIST" overline with `done/total`, segment bar (4 px, 3 px gaps), rows 42 px (44 on iPad/desktop) with a 24 px checkbox and 15/500 text clamped to two lines, hairline dividers, then "Add task" in `primary`.
- **Tabs**: 40 px on phone (46 on iPad/desktop) on `surface-subtler`, active tab `primary` with a 2 px top border.
- Past days are read-only for additions: no Add task, no ticks; open items keep date chips so they can be carried to today.

Source: `organisms/RoutineFocusCard`, `constants/routineFocus.js` (`FOCUS_VARIANTS`, `AGENT_STAGES`, `PERIOD_TABS`), `pages/RoutineFocus.vue`.
