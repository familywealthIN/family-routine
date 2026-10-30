# Button

One primary action per surface, in brand blue with a 16 px radius; everything else is outline, text or a pill.

- **Primary** `primary` fill, white 14/600 label, optional 20 px Material icon before the label. Hover `primary-dark`.
- **Outline** white fill, `primary-dark` label, 1 px inset ring at 45% primary. The secondary action beside a primary ("Start agent" next to "Start task").
- **Text** for Undo, Cancel and inline links.
- **Danger** `danger` fill, only inside a delete confirmation sheet.
- **Pill** (30 px, radius 999, 12/600) for chat actions and chips: "Add all to checklist", quick replies.
- **Header action** a 36 px circle with the glyph alone on phone (`add`, `person_add`); on iPad and desktop the same action shows glyph + label as a labelled button.
- Disabled: grey fill, `text-disabled` label. When an action is blocked, say why next to it in `now-dark` ("Add a goal item to start this routine"), never only grey it out.
- Labels say exactly what happens: "Start task", "Skip today", "Add all to checklist". No "OK" / "Submit".

Source: Vuetify `v-btn` restyled in `packages/ui/styles/theme.css` (radius 16 on every labelled button); chat pills in `organisms/RoutineChatThread`.
