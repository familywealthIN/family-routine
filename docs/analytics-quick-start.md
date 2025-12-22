# Analytics Implementation Quick Start Guide

## Overview

This guide helps developers quickly integrate analytics into new components in the Family Routine app.

## 5-Minute Integration

### Step 1: Import the Mixin

```javascript
import {
    MeasurementMixin
} from '@/utils/measurementMixins.js';

export default {
    name: 'YourComponent',
    mixins: [MeasurementMixin], // Add this line
    // ... rest of component
};
```

### Step 2: Track Page View

```javascript
mounted() {
    this.trackPageView('your_component_name');
}
```

### Step 3: Track User Interactions

Add to button clicks, form submissions, and other interactions:

```javascript
methods: {
    handleClick() {
        this.trackUserInteraction('button_click', 'interaction', {
            button_type: 'primary',
            context: 'your_component',
        });
        // ... your existing logic
    }
}
```

### Step 4: Track Business Events

For important business actions (creating goals, completing tasks, etc.):

```javascript
createGoal(goalData) {
    this.trackBusinessEvent('goal_created', {
        period: goalData.period,
        tags_count: goalData.tags.length,
    });
    // ... your existing logic
}
```

## Common Tracking Patterns

### Navigation Buttons

```javascript
@click = "() => {
trackUserInteraction('navigation_click', 'button_click', {
    from_page: 'current_page',
    to_page: 'target_page',
});
$router.push('/target-page');
}
"
```

### Form Submissions

```javascript
submitForm(formData) {
    this.trackUserInteraction('form_submission', 'form', {
        form_type: 'goal_creation',
        field_count: Object.keys(formData).length,
    });
    // ... form submission logic
}
```

### Dialog/Modal Opens

```javascript
openDialog() {
    this.trackUserInteraction('dialog_open', 'modal', {
        dialog_type: 'goal_details',
        trigger: 'button_click',
    });
    this.dialogVisible = true;
}
```

### Error Handling

```javascript
async loadData() {
    try {
        const data = await this.fetchData();
    } catch (error) {
        this.trackError('data_load_error', error, {
            component: 'YourComponent',
            operation: 'data_fetch',
        });
    }
}
```

## Event Naming Conventions

* Use **snake_case**: `goal_created`,  `user_login`,  `dialog_open`
* Be specific: `goal_period_change` not just `change`
* Include context: `dashboard_filter_applied`,  `profile_settings_saved`

## Parameter Guidelines

**Include relevant context:**

```javascript
// ✅ Good
{
    goal_period: 'week',
    goals_count: 5,
    user_type: 'premium'
}

// ❌ Avoid
{
    data: {
        period: 'week'
    }, // nested objects
    x: 5, // unclear names
    userEmail: 'user@email.com' // PII data
}
```

## Available Tracking Methods

| Method | Use Case | Example |
|--------|----------|---------|
| `trackPageView(page)` | Component mounting | `trackPageView('dashboard')` |
| `trackUserInteraction(action, category, params)` | Clicks, form submissions | `trackUserInteraction('button_click', 'navigation', {...})` |
| `trackBusinessEvent(event, params)` | Goals, tasks, milestones | `trackBusinessEvent('goal_completed', {...})` |
| `trackError(name, error, context)` | Error tracking | `trackError('api_error', error, {...})` |

## Firebase Console

View your analytics data at:
* **Events**: Firebase Console → Analytics → Events
* **Performance**: Firebase Console → Performance
* **Real-time**: Firebase Console → Analytics → Realtime

## Testing

```javascript
// Test in browser console (development only)
this.trackEvent('test_event', {
    test: true
});
```

## Need Help?

* 📖 Full documentation: `docs/measurement-implementation.md`
* 🔧 Check existing implementations in `DashBoard.vue`,  `LoginRoutine.vue`
* 🚨 Issues? Check browser console for analytics errors
