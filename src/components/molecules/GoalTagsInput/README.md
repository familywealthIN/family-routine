# GoalTagsInput

A molecule component that provides a tag input interface with autocomplete functionality for goal tagging.

## Usage

```vue
<GoalTagsInput
  :goalTags="['work', 'urgent']"
  :userTags="allUserTags"
  @update-new-tag-items="handleTagUpdate"
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| goalTags | Array | No | [] | Current tags assigned to the goal |
| userTags | Array | No | [] | Available tags for autocomplete |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| update-new-tag-items | Array<String> | Emitted when tags are added or removed |

## Features

- Tag autocomplete from user's existing tags
- Support for hierarchical tags (area:work, project:name)
- Visual display of hierarchical tags with separators
- Tag editing on click
- Tag removal functionality

## Dependencies

- `@johmun/vue-tags-input` - Tag input component library
