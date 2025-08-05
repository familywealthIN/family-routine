# Analytics Events Catalog

## Event Types Overview

| Type | Purpose | Example Events |
|------|---------|----------------|
| **User Interactions** | Button clicks, form submissions, navigation | `button_click` , `form_submission` , `navigation_click` |
| **Business Events** | Core business actions | `goal_created` , `task_completed` , `user_login` |
| **Page Views** | Component/page tracking | `page_view` |
| **Performance** | Loading times, errors | `component_mount_time` , `api_response_time` |
| **Errors** | Error tracking and debugging | `graphql_error` , `network_error` , `auth_error` |

## Current Events Catalog

### Authentication Events

#### `user_login`

**Type**: Business Event  
**Triggered**: Successful authentication  
**Parameters**:
* `provider` (string): Authentication provider ('google')
* `is_new_user` (boolean): Whether user needs onboarding
* `user_email` (string): User email (hashed)
* `tags_count` (number): Number of user tags

#### `login_attempt`

**Type**: User Interaction  
**Triggered**: User clicks login button  
**Parameters**:
* `provider` (string): Authentication provider
* `page` (string): Current page name

#### `logout_attempt`

**Type**: User Interaction  
**Triggered**: User clicks logout button  
**Parameters**:
* `provider` (string): Authentication provider

#### `logout_success`

**Type**: User Interaction  
**Triggered**: Successful logout  
**Parameters**:
* `provider` (string): Authentication provider

### Onboarding/Wizard Events

#### `onboarding_started`

**Type**: Business Event  
**Triggered**: User begins onboarding wizard  
**Parameters**:
* `user_type` (string): Type of user ('new_user')
* `entry_step` (number): Initial step number
* `source` (string): How user reached onboarding ('login_redirect')

#### `onboarding_step_next`

**Type**: User Interaction  
**Triggered**: User progresses to next onboarding step  
**Parameters**:
* `from_step` (number): Current step number
* `to_step` (number): Next step number
* `step_name` (string): Name of step being entered

#### `onboarding_step_back`

**Type**: User Interaction  
**Triggered**: User goes back to previous onboarding step  
**Parameters**:
* `from_step` (number): Current step number
* `to_step` (number): Previous step number
* `step_name` (string): Name of step being entered

#### `activity_selected`

**Type**: User Interaction  
**Triggered**: User selects morning/evening activity in wizard  
**Parameters**:
* `activity_type` (string): Type of activity ('morning', 'evening')
* `activity_id` (string): Activity identifier
* `current_selections` (number): Total selected activities of this type
* `step` (number): Current wizard step

#### `activity_deselected`

**Type**: User Interaction  
**Triggered**: User deselects morning/evening activity in wizard  
**Parameters**:
* `activity_type` (string): Type of activity ('morning', 'evening')
* `activity_id` (string): Activity identifier
* `current_selections` (number): Total selected activities of this type
* `step` (number): Current wizard step

#### `onboarding_completion_attempted`

**Type**: Business Event  
**Triggered**: User attempts to complete onboarding  
**Parameters**:
* `sleep_time` (string): Selected sleep time
* `wake_time` (string): Selected wake time
* `work_start` (string): Selected work start time
* `work_end` (string): Selected work end time
* `morning_activities_count` (number): Number of selected morning activities
* `evening_activities_count` (number): Number of selected evening activities
* `sleep_hours` (string): Calculated sleep duration

#### `onboarding_completed`

**Type**: Business Event  
**Triggered**: Onboarding successfully completed  
**Parameters**:
* `created_items_count` (number): Number of routine items created
* `total_steps_completed` (number): Total steps completed (5)
* `sleep_hours` (string): Sleep duration
* `work_hours` (string): Work duration

#### `onboarding_complete_redirect`

**Type**: User Interaction  
**Triggered**: User redirected to dashboard after onboarding  
**Parameters**:
* `from_page` (string): Current page ('wizard')
* `to_page` (string): Destination page ('home')
* `items_created` (number): Number of routine items created

### Routine Settings Events

#### `settings_page_accessed`

**Type**: User Interaction  
**Triggered**: User accesses routine settings page  
**Parameters**:
* `routine_items_count` (number): Current number of routine items

#### `add_routine_item_dialog_open`

**Type**: User Interaction  
**Triggered**: User opens add routine item dialog  
**Parameters**:
* `current_items_count` (number): Current number of routine items

#### `routine_item_edit_opened`

**Type**: User Interaction  
**Triggered**: User opens routine item for editing  
**Parameters**:
* `item_id` (string): Routine item identifier
* `item_name` (string): Name of routine item
* `has_steps` (boolean): Whether item has steps
* `steps_count` (number): Number of steps in item

#### `routine_item_delete_confirmed`

**Type**: User Interaction  
**Triggered**: User confirms deletion of routine item  
**Parameters**:
* `item_id` (string): Routine item identifier
* `item_name` (string): Name of routine item
* `has_steps` (boolean): Whether item has steps
* `steps_count` (number): Number of steps in item

#### `routine_item_delete_cancelled`

**Type**: User Interaction  
**Triggered**: User cancels deletion of routine item  
**Parameters**:
* `item_id` (string): Routine item identifier

#### `routine_item_created`

**Type**: Business Event  
**Triggered**: New routine item is created  
**Parameters**:
* `item_name` (string): Name of routine item
* `has_description` (boolean): Whether item has description
* `time` (string): Scheduled time for item
* `points` (number): Points assigned to item
* `steps_count` (number): Number of steps in item
* `has_start_event` (boolean): Whether item has start event
* `has_end_event` (boolean): Whether item has end event
* `tags_count` (number): Number of tags assigned

#### `routine_item_creation_success`

**Type**: Business Event  
**Triggered**: Routine item successfully created  
**Parameters**:
* `item_name` (string): Name of routine item
* `total_items` (number): Total routine items after creation

### Goal Management Events

#### `goal_created`

**Type**: Business Event  
**Triggered**: New goal is created  
**Parameters**:
* `period` (string): Goal time period ('day', 'week', 'month', 'year')
* `is_milestone` (boolean): Whether goal is a milestone
* `has_deadline` (boolean): Whether goal has a deadline
* `tags_count` (number): Number of tags assigned
* `goal_length` (number): Character length of goal text

#### `goal_updated`

**Type**: Business Event  
**Triggered**: Existing goal is modified  
**Parameters**:
* `goal_id` (string): Unique goal identifier
* `period` (string): Goal time period
* `is_milestone` (boolean): Whether goal is a milestone
* `has_deadline` (boolean): Whether goal has a deadline
* `tags_count` (number): Number of tags assigned

#### `goal_period_change`

**Type**: User Interaction  
**Triggered**: User changes goal time period filter  
**Parameters**:
* `from_period` (string): Previous period
* `to_period` (string): New period
* `selected_task_ref` (string): Currently selected task reference

#### `add_goal_dialog_open`

**Type**: User Interaction  
**Triggered**: User opens goal creation dialog  
**Parameters**:
* `from_page` (string): Current page
* `goals_count` (number): Current number of goals

### Task Management Events

#### `task_completed`

**Type**: Business Event  
**Triggered**: User completes a task  
**Parameters**:
* `task_id` (string): Unique task identifier
* `goal_id` (string): Associated goal identifier
* `completion_time` (number): Time taken to complete
* `date` (string): Completion date

#### `check_dialog_click`

**Type**: User Interaction  
**Triggered**: User opens task check dialog  
**Parameters**:
* `task_id` (string): Task identifier
* `date` (string): Current date
* `goal_period` (string): Current goal period filter

#### `check_click`

**Type**: User Interaction  
**Triggered**: User clicks task check button  
**Parameters**:
* `task_id` (string): Task identifier
* `is_completed` (boolean): New completion status
* `goal_period` (string): Current goal period

### Navigation Events

#### `page_view`

**Type**: Page View  
**Triggered**: Component mounts/page loads  
**Parameters**:
* `page_name` (string): Name of page/component
* `user_id` (string): Current user identifier
* `session_id` (string): Session identifier

#### `navigation_click`

**Type**: User Interaction  
**Triggered**: User clicks navigation elements  
**Parameters**:
* `from_page` (string): Current page
* `to_page` (string): Destination page
* `nav_type` (string): Type of navigation ('button', 'menu', 'breadcrumb')

#### `milestones_navigation`

**Type**: User Interaction  
**Triggered**: User navigates to milestones page  
**Parameters**:
* `from_page` (string): Current page ('goals')
* `to_page` (string): Destination page ('milestones')

#### `onboarding_redirect`

**Type**: User Interaction  
**Triggered**: New user redirected to onboarding  
**Parameters**:
* `from_page` (string): Current page ('login')
* `to_page` (string): Destination page ('wizard')

#### `dashboard_redirect`

**Type**: User Interaction  
**Triggered**: Existing user redirected to dashboard  
**Parameters**:
* `from_page` (string): Current page ('login')
* `to_page` (string): Destination page ('home')

#### `auto_redirect_authenticated`

**Type**: User Interaction  
**Triggered**: Automatic redirect for authenticated users  
**Parameters**:
* `from_page` (string): Current page
* `to_page` (string): Destination page
* `redirect_count` (number): Number of redirects in session

### Component Lifecycle Events

#### `goals_page_mounted`

**Type**: User Interaction  
**Triggered**: Goals component successfully mounts  
**Parameters**:
* `component` (string): Component name ('GoalsTime')
* `goals_count` (number): Number of goals loaded

#### `dashboard_mounted`

**Type**: User Interaction  
**Triggered**: Dashboard component mounts  
**Parameters**:
* `component` (string): Component name ('DashBoard')
* `mount_time` (number): Time when component mounted

### Dialog/Modal Events

#### `toggle_goal_details_dialog`

**Type**: User Interaction  
**Triggered**: User opens/closes goal details dialog  
**Parameters**:
* `goal_id` (string): Goal identifier
* `action` (string): 'open' or 'close'
* `goal_period` (string): Current goal period

#### `dialog_open`

**Type**: User Interaction  
**Triggered**: Any dialog/modal is opened  
**Parameters**:
* `dialog_type` (string): Type of dialog
* `trigger` (string): What triggered the dialog
* `context` (string): Current context/page

### Error Events

#### `login_error`

**Type**: Error  
**Triggered**: Authentication failure  
**Parameters**:
* `provider` (string): Authentication provider
* `error_type` (string): Type of error ('auth_failure')

#### `login_session_error`

**Type**: Error  
**Triggered**: Session creation failure  
**Parameters**:
* `provider` (string): Authentication provider
* `error_type` (string): Type of error ('auth_mutation_failure')

#### `logout_error`

**Type**: Error  
**Triggered**: Logout failure  
**Parameters**:
* `provider` (string): Authentication provider
* `error_type` (string): Type of error ('signout_failure')

#### `graphql_error`

**Type**: Error  
**Triggered**: GraphQL operation fails  
**Parameters**:
* `operation_name` (string): Name of failed operation
* `query` (string): GraphQL query/mutation text

#### `network_error`

**Type**: Error  
**Triggered**: Network connectivity issues  
**Parameters**:
* `operation_name` (string): Name of failed operation

#### `onboarding_completion_error`

**Type**: Error  
**Triggered**: Error during onboarding completion  
**Parameters**:
* `step` (string): Current step name ('complete_setup')
* `has_morning_activities` (boolean): Whether user selected morning activities
* `has_evening_activities` (boolean): Whether user selected evening activities

#### `routine_item_creation_error`

**Type**: Error  
**Triggered**: Error creating routine item  
**Parameters**:
* `item_name` (string): Name of routine item being created
* `steps_count` (number): Number of steps in item

### Performance Events

#### `component_mount_time`

**Type**: Performance  
**Triggered**: Component finishes mounting  
**Parameters**:
* `component_name` (string): Name of component
* `mount_duration` (number): Time taken to mount (ms)

#### `api_response_time`

**Type**: Performance  
**Triggered**: API call completes  
**Parameters**:
* `endpoint` (string): API endpoint
* `response_time` (number): Response time (ms)
* `success` (boolean): Whether call succeeded

## Event Parameter Standards

### Common Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `user_id` | string | Current user identifier | "user_123" |
| `session_id` | string | Current session identifier | "session_456" |
| `page_name` | string | Current page/component name | "dashboard" |
| `timestamp` | number | Event timestamp | 1642694400000 |
| `app_version` | string | Application version | "1.2.3" |

### Goal-Specific Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `goal_id` | string | Goal identifier | "goal_789" |
| `goal_period` | string | Goal time period | "week" |
| `is_milestone` | boolean | Whether goal is milestone | true |
| `tags_count` | number | Number of goal tags | 3 |
| `has_deadline` | boolean | Whether goal has deadline | false |

### User Interaction Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `button_type` | string | Type of button clicked | "primary" |
| `form_type` | string | Type of form submitted | "goal_creation" |
| `nav_type` | string | Type of navigation | "menu" |
| `dialog_type` | string | Type of dialog opened | "goal_details" |

## Firebase Analytics Dashboard Views

### Key Metrics to Monitor

1. **User Engagement**
   - Page views by component
   - Session duration
   - User retention

2. **Feature Usage**
   - Goal creation frequency
   - Task completion rates
   - Feature adoption

3. **User Journey**
   - Authentication funnel
   - Onboarding completion
   - Goal creation flow

4. **Performance**
   - Component load times
   - API response times
   - Error rates

### Custom Dashboards

Create custom dashboards in Firebase for:
* **Product Metrics**: Goal creation, task completion
* **Technical Metrics**: Performance, errors
* **User Experience**: Navigation patterns, feature usage

## Event Implementation Checklist

* [ ] Event name follows snake_case convention
* [ ] Parameters are descriptive and consistent
* [ ] No PII (personally identifiable information) included
* [ ] Event is triggered at the right time
* [ ] Parameters include relevant context
* [ ] Event is documented in this catalog
* [ ] Testing completed in development environment

## Usage Examples

### Viewing Events in Firebase Console

1. Go to Firebase Console → Analytics → Events
2. Select date range
3. Filter by event name or parameter
4. Create custom reports and funnels

### Custom Event Analysis

```javascript
// Example: Analyze goal creation by period
// Filter events: goal_created
// Group by: period parameter
// Result: See which goal periods are most popular
```

### Performance Monitoring

```javascript
// Example: Monitor component load times
// View: Performance → Custom traces
// Filter: component_mount_time traces
// Result: Identify slow-loading components
```
