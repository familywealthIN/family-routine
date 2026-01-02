# ProjectSidebar

A molecule component that displays a collapsible list of user projects in the sidebar navigation.

## Usage

```vue
<ProjectSidebar />
```

## Props

This component doesn't accept props. It fetches project tags from the GraphQL API.

## GraphQL Query

```graphql
query projectTags {
  projectTags
}
```

## Features

* Fetches project tags from the API
* Collapsible list group with "Projects" header
* Displays projects with folder icons
* Navigation to project detail pages
* Formats project names (removes "project:" prefix and capitalizes)

## Navigation

Clicking a project navigates to:

```
{ name: 'projects', params: { tag: 'project:website' } }
```

## Styling

* Custom subheader styling
* Primary color for prepend icon
* Folder icons for visual clarity
* Minimum header height of 40px
