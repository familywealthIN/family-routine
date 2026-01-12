# ContainerBox

A template component that provides a centered container layout with loading state and optional transparency.

## Usage

```vue
<ContainerBox :isLoading="false" :transparent="false">
  <div>Your content here</div>
</ContainerBox>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| isLoading | Boolean | No | false | Shows loading spinner when true |
| transparent | Boolean | No | false | Makes container background transparent |

## Features

* Responsive centered layout (max-width 800px)
* Automatic loading state with spinner
* Fade-in animation for content
* Transparent mode for seamless backgrounds
* Slot-based content insertion

## Layout

* **Desktop**: 10/12 columns with offset (centered)
* **Mobile**: Full width (12/12 columns)

## Styling

* Default: White card with elevation
* Transparent: No background, no elevation
* Animation: 1s fade-in effect

## Use Cases

* Page containers
* Form wrappers
* Content sections
* Loading states
