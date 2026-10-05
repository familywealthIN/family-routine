# StreakChecks

A molecule component that displays a period goal's streak as one node per calendar day.

## Usage

```vue
<StreakChecks :days="goalItem.milestoneDays" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| days | Array | No | [] | One `{ date: 'DD-MM-YYYY', status }` per calendar day of the period, in calendar order (the server's `milestoneDays`) |
| animate | Boolean | No | false | Whether to animate the most recently completed day |

## Statuses

| status | Icon | Colour | Meaning |
|--------|------|--------|---------|
| complete | check_circle | green | The day's milestone was met |
| missed | cancel | red | The day is past and its milestone was not met |
| upcoming | radio_button_unchecked | grey | The milestone is still winnable |
| none | remove | grey lighten-1 | No milestone was declared for that day |

## Features

* Calendar-aligned: node N is always day N of the period, never the Nth completion
* Every node is labelled with its weekday and date, and carries the full date in its tooltip
* Connectors are solid green only between two completed days; a break is drawn as a grey dash
* Optional animation for the most recent win

## Animation Behavior

When `animate` is true, the most recently completed day animates from outlined to filled after 500ms.

## Styling

* Green for wins, red for misses, grey for everything unearned
* 24px icon size
* Responsive flex layout
