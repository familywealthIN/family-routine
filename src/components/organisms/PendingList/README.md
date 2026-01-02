# PendingList

An organism component that displays a list of pending goals with quick creation functionality.

## Usage

```vue
<PendingList />
```

## Props

This component doesn't accept props. It fetches data via GraphQL queries.

## Features

* Displays pending goals from GraphQL API
* Quick goal creation interface
* List/Grid view toggle
* Goal status management
* Integration with GoalCreation component

## GraphQL Queries

Fetches pending goals data including:
* Goal items
* Task lists
* Due dates
* Status information

## User Interactions

* Click to expand goal details
* Quick add new goals
* Mark goals as complete
* Edit existing goals

## Component Dependencies

* GraphQL client
* GoalCreation component for editing
* Goal display components

## Use Cases

* Sidebar widget for pending tasks
* Dashboard pending goals view
* Quick goal management interface
