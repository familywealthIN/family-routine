# Toast

The single notification surface in the app: a dark card with an icon, a bold title and a one-line consequence, shown for about 2.8 s.

- `toast-bg` (#1a1a1a), white text, radius 14, padding 12/14, gap 10, `shadow-toast`. Icon 22 px; title 14/700; sub 12/400 at 75% opacity.
- Icon colour by type: success `check_circle` `toast-success`, error `error_outline` `toast-error`, warning `warning` `toast-warning`, info `info` `toast-info`.
- Phone: full width with 16 px side insets, 80 px above the bottom so it clears the 64 px tab bar. iPad and desktop: a 360 px card 24 px from the bottom-right corner.
- Motion `rn-toast`: rises 12 px and fades in over the first 12%, holds, fades out from 85%. Minimum 2.8 s.
- Copy is always **title + consequence** ("Routine ticked" / "D +10 · streak kept"). A toast with no consequence has not been written yet.
- It never takes pointer events and sits above sheets and drawers (z 75). There is no second toast style, snackbar or banner for feedback.

Source: `molecules/AppToast`, `apps/web-app/src/plugins/notifications.js` (`$notify` maps every call onto it).
