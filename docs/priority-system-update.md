# Priority System Update

## Overview

Updated the priority tag system from traditional urgency levels to action-based priority categories based on the Eisenhower Matrix.

## Changes Made

### Before (Old System)

* `priority:urgent` - Highest priority tasks
* `priority:high` - High priority tasks  
* `priority:medium` - Medium priority tasks
* `priority:low` - Low priority tasks

### After (New System)

* `priority:do` - Important and urgent tasks requiring immediate action
* `priority:plan` - Important but not urgent tasks to be scheduled
* `priority:delegate` - Urgent but not important tasks that can be assigned to others
* `priority:automate` - Neither urgent nor important tasks that can be systematized

## Eisenhower Matrix Mapping

| Quadrant | Priority Tag | Description |
|----------|-------------|-------------|
| Important + Urgent | `priority:do` | Crisis mode - immediate action required |
| Important + Not Urgent | `priority:plan` | Proactive planning - schedule and focus |
| Not Important + Urgent | `priority:delegate` | Distractions - delegate if possible |
| Not Important + Not Urgent | `priority:automate` | Time wasters - automate or eliminate |

## Files Updated

1. `src/utils/aiApi.js` - Updated AI prompt for task extraction
2. `docs/ai-milestone-goal-task-integration.md` - Updated documentation examples

## Benefits

* More actionable priority categorization
* Aligns with proven productivity methodology (Eisenhower Matrix)
* Encourages better task management decisions
* Clearer guidance on how to handle different types of tasks

## Note

The `urgency` tag remains separate from priority and continues to use: critical, high, medium, low
