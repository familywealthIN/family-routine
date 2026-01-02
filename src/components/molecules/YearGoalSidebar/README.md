# YearGoalSidebar

A molecule component that displays a collapsible list of year goals organized by category with completion tracking.

## Usage

```vue
<YearGoalSidebar />
```

## Props

This component doesn't accept props. It fetches year goals from the GraphQL API.

## GraphQL Query

```graphql
query currentYearGoals {
  currentYearGoals {
    id
    date
    goalItems {
      id
      body
      isComplete
    }
  }
}
```

## Features

- Fetches current year goals from the API
- Groups goals by category (goal body)
- Displays completion count (completed/total)
- Shows "No goals created yet" message when empty
- Link to "All Goals" page
- Collapsible list group with "Goals" header

## Navigation

- Category click navigates to: `{ name: 'yearGoals', params: { category } }`
- "All Goals" navigates to: `/goals`

## Computed Properties

- `groupedYearGoals`: Aggregates goals by category with completion statistics

## Styling

- Custom subheader styling
- Goal count badge styling
- Empty state message styling
- Calendar icons for goal categories
