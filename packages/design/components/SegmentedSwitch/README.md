# Segmented switch

A sliding control for choosing one of 2–5 views, in two variants: a white thumb on a grey track, or an underline under icon-and-label tabs.

- **Thumb**: track `rgba(0,0,0,.06)`, padding 3, radius 12; thumb white, radius 9, `0 1px 3px rgba(0,0,0,.12)`. Labels 13/600, `text-secondary`, active `text`. Thumb width `(100% − 6px) / n`, left `3px + i × (100% − 6px) / n`.
- **Underline**: 1 px `divider-strong` baseline, 2 px `primary` indicator `100% / n` wide; segments stack an icon over the label; active `primary`.
- Compact `xs` size: 2 px track inset, radius 10, so five segments fit a phone dialog.
- Motion: the indicator slides on `left .28s cubic-bezier(.4,0,.2,1)`.
- Used for Progress (Day · Week · Month · Year), Profile (12h / 24h), About's five feature tabs and the agent event kind (URL / cURL). Not Vuetify `v-tabs` or `v-btn-toggle`.

Source: `molecules/SlidingSwitch`.
