# Progress ring

The one ring the app draws everywhere: an SVG circle whose arc starts at 12 o'clock, with round caps and an optional centre label.

- Maths: circumference `c = 2πr`, `stroke-dashoffset = c × (1 − value/100)`, SVG rotated −90°. The rendered `size` and the `viewBox` are independent.
- Colour rule: `success` at 100%, `now` for today or the current period, `primary` otherwise, no arc for the future.
- Standard sizes: Goals ladder step 44 px (r 20, stroke 4), Goals calendar day 34 px (r 21, stroke 3), Year hero 120 px (viewBox 96, r 42, stroke 7), Priority tile 26 px, drawer D/K/G 30 px (stroke 3).
- **D/K/G trio**: three concentric rings in a 128 box, r 56 / 42 / 28, stroke 10, each on a 12% tint of its own colour (`stimulus-d`, `stimulus-k`, `stimulus-g`). Order is always D, K, G from the outside in. Values can exceed 100% early in a period; the arc clamps, the legend prints the real number.
- Year percentage is `round(count / 6 × 100)`, so 5 of 6 months reads 83%.

Source: `molecules/ProgressRing`, `molecules/DkgRingTrio`, `docs/redesign/chassis.md` § Rings.
