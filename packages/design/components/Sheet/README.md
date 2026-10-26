# Sheet and card

Content sits on white cards over the grey page; anything that asks for input opens as one component in two presentations, a bottom sheet on phone and a centred modal on iPad and desktop.

- **Card**: `surface`, radius 16 on phone and 20 on iPad/desktop, `shadow-raised` (Home's cards and composer use the flatter `shadow-card` so they sit level). Padding 16 on phone, 20 on iPad/desktop. Section labels are 11/700 uppercase overlines in `text-tertiary`.
- A selected card gets `shadow-selected`, an inset 2 px primary ring, never an outer one.
- **Phone sheet**: pinned to the bottom, radius 16 16 0 0, scrim `rgba(0,0,0,.32)`, enters with `translateY(28px) → 0` over .25 s `cubic-bezier(.3,1.1,.5,1)`.
- **iPad modal** 860 px wide and **desktop modal** 720 px, radius 20, scrim `rgba(15,23,42,.42)`, `shadow-modal`, max 94% wide and 86% tall. Exceptions: the Routines editor is 560 px; Year Goals' menu and delete confirm 480 px; Goals' new-goal sheet 500 px.
- Fields inside are `surface-subtle` wells, radius 12, 44 px tall; one primary button at the bottom.
- Scrolling card columns must not shrink their cards: use `grid-auto-rows: max-content` or `flex-shrink: 0`.

Source: `molecules/ResponsiveSheet`, `atoms/BottomSheet`, `docs/redesign/chassis.md` § Sheet vs dialog.
