# Intelligent AI Search Mode Detection

## Overview

Removed the manual Goals/Task toggle buttons and implemented intelligent mode detection based on the user's search query content.

## Changes Made

### AiSearchModal.vue

1. **Removed Toggle Buttons**: Eliminated the v-btn-toggle for Goals/Task mode selection
2. **Intelligent Mode Detection**: Implemented smart detection in `isTaskMode` computed property:
   - **Task Mode (Default)**: When query doesn't contain time or planning keywords
   - **Goals Mode**: When query contains time keywords (week, month, year, weekly, monthly, yearly, weeks, months, years) or planning keywords (plan, schedule, routine, program, strategy, course, curriculum)

3. **Dynamic UI Updates**:
   - Header title changes dynamically based on detected mode
   - Icon changes based on mode (task_alt for tasks, timeline for goals)
   - Placeholder text adapts to the detected mode

4. **Reactive Query Detection**: Added `@input="onQueryChange"` to trigger reactivity when users type

### DesktopLayout.vue

* Updated search box text from "Build your routine goals with AI" to "Ask AI to help with tasks or goals"

### Data Structure Changes

* Removed fixed `mode` property from component data
* Mode is now computed intelligently based on query content

## Detection Logic Examples

**Task Mode (Default):**
* "Call dentist tomorrow" → TASK mode
* "Buy groceries after work" → TASK mode  
* "Send an email to client" → TASK mode
* "Fix the bug in the code" → TASK mode

**Goals Mode (Time/Planning Keywords):**
* "Create a fitness plan for the next week" → GOALS mode
* "Build a study schedule for this month" → GOALS mode
* "Plan my workout routine for the year" → GOALS mode
* "Design a weekly meal plan" → GOALS mode
* "Monthly budget planning" → GOALS mode

## Benefits

1. **Improved UX**: Users don't need to manually select mode
2. **Natural Interface**: Mode detection feels intuitive and automatic
3. **Reduced Cognitive Load**: One less decision for users to make
4. **Smart Defaults**: Defaults to task mode for simple, immediate actions
5. **Context Awareness**: Automatically switches to goals mode for planning queries

## Technical Implementation

* Uses regex patterns to detect time keywords and planning keywords
* Computed property ensures reactive updates as user types
* Maintains backward compatibility with all existing functionality
* No breaking changes to parent components or APIs
