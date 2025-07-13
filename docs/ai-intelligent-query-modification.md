# AI Intelligent Query Modification System

## Overview

The AI search system has been enhanced with intelligent query modification that automatically adjusts time-based queries to provide more relevant and practical planning results. This system analyzes the remaining time in current periods (week, month, year) and modifies user queries accordingly.

## Problem Solved

Previously, when users requested plans like "create a fitness plan for this week" on a Wednesday with only 4 days left, the system would generate a 7-day plan starting immediately, which wasn't practical. The new system intelligently shifts to more appropriate timeframes.

## Implementation Details

### Frontend Changes (AiSearchModal.vue)

#### New Method: `modifyQueryPeriod(query)`

This method intelligently modifies the user's query based on remaining time in current periods:

**Week Logic:**
* **5-7 days left**: Replaces "week" with specific number of remaining days (e.g., "6 days")
* **<5 days left**: Replaces "week" with "next week starting Sunday"

**Month Logic:**
* **3+ weeks left**: Replaces "month" with specific number of remaining weeks (e.g., "4 weeks")
* **<3 weeks left**: Replaces "month" with "next month (Month YYYY)"

**Year Logic:**
* **6+ months left**: Replaces "year" with specific number of remaining months (e.g., "8 months")
* **<6 months left**: Replaces "year" with "next year (YYYY)"

#### Enhanced `searchGoals()` Method

* Now calls `modifyQueryPeriod()` before sending the query to the backend
* Logs both original and modified queries for debugging

### Backend Changes (aiApi.js)

#### Enhanced `generateMilestonePlan()`

* **Improved timeframe detection** to handle modified queries with specific numbers (e.g., "5 days", "3 weeks", "8 months")
* **Pattern matching** for "next week", "next month", "next year" phrases
* **Fallback logic** to original keyword detection for basic queries

#### Enhanced `generateEntriesTemplate()`

* **Context-aware date calculation** based on the modified query content
* **Dynamic range adjustment** based on specific numbers in queries
* **Smart date handling** for "next week starting Sunday", "next month", "next year" scenarios

**Week Planning:**
* Detects specific day counts (e.g., "5 days") and adjusts range accordingly
* Handles "next week starting Sunday" to calculate proper start dates
* Defaults to starting from tomorrow for regular week plans

**Month Planning:**
* Detects specific week counts (e.g., "4 weeks") and adjusts range accordingly
* Handles "next month" to start from the first day of next month
* Limits ranges to reasonable maximums (8 weeks max for month plans)

**Year Planning:**
* Detects specific month counts (e.g., "8 months") and adjusts range accordingly
* Handles "next year" to start from January of next year
* Maintains proper month names with years for clarity

#### Smart Date Filtering

* Filters out null dates when ranges are adjusted
* Ensures only valid, relevant time periods are included in plans

## User Experience Improvements

1. **More Relevant Plans**: Users get plans that make sense for the actual time remaining in their current period
2. **Smarter Defaults**: No more "weekly plans" that start on a Wednesday when the week is almost over
3. **Future-Focused**: Automatically shifts to next period when current period is nearly complete
4. **Transparent Logic**: Console logging helps with debugging and understanding query modifications

## Examples of How It Works

### Example 1: Mid-Week Planning

**Input**: "Create a fitness plan for this week" (on Wednesday with 4 days left)
**Modified**: "Create a fitness plan for next week starting Sunday"
**Result**: 7-day plan starting next Sunday

### Example 2: Late Month Planning

**Input**: "Build a study schedule for this month" (on the 20th with 2 weeks left)
**Modified**: "Build a study schedule for next month (July 2025)"
**Result**: Month-long plan starting July 1st

### Example 3: Late Year Planning

**Input**: "Plan my goals for this year" (in August with 4 months left)
**Modified**: "Plan my goals for next year (2026)"
**Result**: 12-month plan starting January 2026

### Example 4: Early Week Planning

**Input**: "Create a workout routine for this week" (on Monday with 6 days left)
**Modified**: "Create a workout routine for 6 days"
**Result**: 6-day plan starting from current date

## Technical Implementation

### Query Modification Logic

```javascript
modifyQueryPeriod(query) {
    const now = moment();
    let modifiedQuery = query;

    // Week logic
    if (/\bweek\b/i.test(query)) {
        const daysLeftInWeek = 7 - now.day();

        if (daysLeftInWeek >= 5) {
            modifiedQuery = modifiedQuery.replace(/\bweek\b/gi, `${daysLeftInWeek} days`);
        } else {
            modifiedQuery = modifiedQuery.replace(/\bweek\b/gi, 'next week starting Sunday');
        }
    }

    // Month logic
    if (/\bmonth\b/i.test(query)) {
        const daysLeftInMonth = now.clone().endOf('month').diff(now, 'days') + 1;
        const weeksLeftInMonth = Math.ceil(daysLeftInMonth / 7);

        if (weeksLeftInMonth >= 3) {
            modifiedQuery = modifiedQuery.replace(/\bmonth\b/gi, `${weeksLeftInMonth} weeks`);
        } else {
            const nextMonth = now.clone().add(1, 'month').format('MMMM YYYY');
            modifiedQuery = modifiedQuery.replace(/\bmonth\b/gi, `next month (${nextMonth})`);
        }
    }

    // Year logic
    if (/\byear\b/i.test(query)) {
        const monthsLeftInYear = 12 - now.month();

        if (monthsLeftInYear >= 6) {
            modifiedQuery = modifiedQuery.replace(/\byear\b/gi, `${monthsLeftInYear} months`);
        } else {
            const nextYear = now.clone().add(1, 'year').format('YYYY');
            modifiedQuery = modifiedQuery.replace(/\byear\b/gi, `next year (${nextYear})`);
        }
    }

    return modifiedQuery;
}
```

### Backend Pattern Detection

```javascript
// Enhanced timeframe determination from query
let timeframe = 'week'; // default

// Check for specific patterns in the modified query
if (/\d+\s*days?\b/i.test(userQuery) || /next\s*week/i.test(userQuery)) {
    timeframe = 'week';
} else if (/\d+\s*weeks?\b/i.test(userQuery) || /next\s*month/i.test(userQuery)) {
    timeframe = 'month';
} else if (/\d+\s*months?\b/i.test(userQuery) || /next\s*year/i.test(userQuery)) {
    timeframe = 'year';
}
```

## Benefits

### For Users

* **Practical Planning**: Always get plans that fit your actual available time
* **Seamless Experience**: No need to manually calculate or specify dates
* **Future-Oriented**: Automatically focuses on upcoming periods when current ones are nearly over
* **Consistent Results**: Plans always make logical sense regardless of when they're created

### For Developers

* **Maintainable Code**: Clear separation of concerns between query modification and plan generation
* **Extensible Logic**: Easy to add new time period rules or modify existing ones
* **Debugging Support**: Console logging for troubleshooting query modifications
* **Robust Fallbacks**: Graceful handling of edge cases and unexpected inputs

## Configuration

The system uses these thresholds for decision-making:

* **Week threshold**: 5 days (if less than 5 days left, move to next week)
* **Month threshold**: 3 weeks (if less than 3 weeks left, move to next month)
* **Year threshold**: 6 months (if less than 6 months left, move to next year)

These thresholds can be adjusted in the `modifyQueryPeriod` method if different behavior is desired.

## Future Enhancements

Potential improvements to consider:

1. **User Preferences**: Allow users to set their own thresholds for when to switch periods
2. **Time Zone Support**: Consider user's timezone for more accurate date calculations
3. **Business Days**: Option to consider only weekdays for work-related planning
4. **Custom Periods**: Support for custom date ranges (e.g., "next quarter", "next semester")
5. **Smart Suggestions**: Show users what the system modified and allow them to override

## Dependencies

* **Moment.js**: Used for date calculations and formatting
* **Vue.js**: Frontend framework for reactive UI updates
* **GraphQL**: API communication between frontend and backend
* **Gemini AI API**: Backend AI service for plan generation

## Testing Considerations

When testing this system, consider:

1. **Edge Cases**: Test on the last day of weeks/months/years
2. **Time Zones**: Verify behavior across different time zones
3. **Leap Years**: Ensure February calculations work correctly
4. **Weekend Planning**: Test week transitions on different days of the week
5. **Multiple Keywords**: Test queries with multiple time-related keywords

This intelligent query modification system ensures that AI-generated plans are always practical and relevant to the user's actual timeframe, providing a much better user experience and more actionable planning results.
