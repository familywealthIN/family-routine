# WakeCheck

An atom component that provides a wake lock toggle for iPad devices to prevent screen sleep.

## Usage

```vue
<WakeCheck />
```

## Props

This component doesn't accept props.

## Features

* Automatically detects iPad devices via user agent
* Uses NoSleep.js library to prevent screen sleep
* Toggle switch to enable/disable wake lock
* Handles visibility change events to re-enable wake lock

## Platform Support

* Only displays on iPad devices
* Hidden on other platforms

## Dependencies

* `nosleep.js` - Wake lock library for preventing screen sleep

## Events

The component logs wake lock state changes to console for debugging.
