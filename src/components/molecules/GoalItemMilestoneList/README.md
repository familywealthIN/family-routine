# GoalItemMilestoneList

A recursive molecule component that displays a list of goal milestones with nested sub-milestones.

## Usage

```vue
<ul>
  <GoalItemMilestoneList :goalItems="goalItems" />
</ul>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| goalItems | Array | Yes | - | Array of goal items, each can have nested milestones |

## Features

* Recursive rendering of nested milestones
* Collapsible details for items with sub-milestones
* Automatic indentation for nested levels
* Uses GoalItemMilestoneTile for individual items

## Goal Items Structure

```javascript
[{
    id: String,
    body: String,
    period: String,
    date: String,
    isComplete: Boolean,
    milestones: Array // Optional nested milestones
}]
```

## Component Behavior

* Items with `milestones` array render as expandable details
* Items without milestones render as simple tiles
* Recursive structure supports infinite nesting depth

## Dependencies

* `GoalItemMilestoneTile` - For individual milestone rendering
