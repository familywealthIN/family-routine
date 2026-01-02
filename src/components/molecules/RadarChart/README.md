# RadarChart

A molecule component that wraps the vue-radar library for displaying radar/spider chart visualizations.

## Usage

```vue
<RadarChart :size="300" :stats="stats" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| size | Number/String | No | 300 | Diameter of the radar chart in pixels |
| stats | Array | No | [] | Array of stat objects for the chart |

## Stats Structure

```javascript
[{
        stat: 'stat1',
        value: 80
    },
    {
        stat: 'stat2',
        value: 60
    },
    {
        stat: 'stat3',
        value: 90
    }
]
```

## Features

* Configurable chart size
* Customizable stroke colors and widths
* Semi-transparent polygon fill
* External and internal grid structure

## Dependencies

* `vue-radar` - External charting library

## Styling

* Default polycolor: `rgba(40, 139, 213, .8)` (blue with transparency)
* External stroke: Black with 50% opacity
* Internal strokes: Hidden (0 width)

## Use Cases

* Skill assessments
* Performance metrics visualization
* Multi-dimensional data comparison
