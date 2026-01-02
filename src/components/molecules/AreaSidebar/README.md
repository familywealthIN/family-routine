# AreaSidebar

A molecule component that displays a collapsible list of user areas in the sidebar navigation.

## Usage

```vue
<AreaSidebar />
```

## Props

This component doesn't accept props. It fetches area tags from the GraphQL API.

## GraphQL Query

```graphql
query areaTags {
  areaTags
}
```

## Features

- Fetches area tags from the API
- Collapsible list group with "Areas" header
- Displays areas with widget icons
- Navigation to area detail pages
- Formats area names (removes "area:" prefix and capitalizes)

## Navigation

Clicking an area navigates to:
```
{ name: 'areas', params: { tag: 'area:work' } }
```

## Styling

- Custom subheader styling
- Primary color for prepend icon
- Minimum header height of 40px
