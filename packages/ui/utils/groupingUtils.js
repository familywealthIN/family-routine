/**
 * Grouping utilities for organizing items in dropdowns and lists
 * Uses Vuetify's header object pattern: { header: 'Group Name' }
 */

/**
 * Group items by a property value, inserting header objects for Vuetify select/list
 *
 * @param {Array} items - Array of items to group
 * @param {String} groupByKey - Property name to group by (e.g., 'taskRef')
 * @param {Function} labelFn - Function to get header label: (groupValue, items) => string
 * @param {Object} options - Additional options
 * @param {Boolean} options.sortByGroup - Whether to sort by group key first (default: true)
 * @param {Function} options.itemTransform - Optional function to transform each item
 * @returns {Array} Grouped array with header objects
 *
 * @example
 * // Group goal items by taskRef
 * const grouped = groupItemsWithHeaders(goalItems, 'taskRef', (taskRef, items) => {
 *   const task = tasklist.find(t => t.id === taskRef || t.taskId === taskRef);
 *   return task?.name || `Unknown Task (${taskRef})`;
 * });
 *
 * // Result: [{ header: 'Morning Routine' }, { ...goalItem1 }, { ...goalItem2 }, { header: 'Evening Routine' }, ...]
 */
export function groupItemsWithHeaders(items, groupByKey, labelFn, options = {}) {
  const {
    sortByGroup = true,
    itemTransform = null,
  } = options;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return [];
  }

  const groupedItems = [];
  let currentGroupValue = null;

  // Sort by group key if requested
  const sortedItems = sortByGroup
    ? [...items].sort((a, b) => {
      const aVal = a[groupByKey] || '';
      const bVal = b[groupByKey] || '';
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    })
    : [...items];

  sortedItems.forEach((item) => {
    const groupValue = item[groupByKey] || '';

    // Transform item if transform function provided
    const transformedItem = itemTransform ? itemTransform(item) : item;

    // When group value changes, insert a header
    if (groupValue !== currentGroupValue) {
      currentGroupValue = groupValue;
      const headerLabel = labelFn(groupValue, items);
      groupedItems.push({ header: headerLabel });
    }

    groupedItems.push(transformedItem);
  });

  return groupedItems;
}

/**
 * Group routine tasks by time period (morning, afternoon, evening, night)
 *
 * @param {Array} tasklist - Array of routine task objects with 'time' property
 * @returns {Array} Grouped array with header objects for time periods
 *
 * @example
 * const grouped = groupTasksByTimePeriod(tasklist);
 * // Result: [{ header: 'Morning (6:00 - 12:00)' }, task1, task2, { header: 'Afternoon (12:00 - 18:00)' }, ...]
 */
export function groupTasksByTimePeriod(tasklist) {
  if (!tasklist || !Array.isArray(tasklist) || tasklist.length === 0) {
    return [];
  }

  const getTimePeriod = (time) => {
    if (!time) return { order: 5, label: 'Unscheduled' };

    const [hours] = time.split(':').map(Number);

    if (hours >= 6 && hours < 12) {
      return { order: 1, label: 'Morning (6:00 - 12:00)' };
    }
    if (hours >= 12 && hours < 18) {
      return { order: 2, label: 'Afternoon (12:00 - 18:00)' };
    }
    if (hours >= 18 && hours < 22) {
      return { order: 3, label: 'Evening (18:00 - 22:00)' };
    }
    return { order: 4, label: 'Night (22:00 - 6:00)' };
  };

  // Add period info to each task
  const tasksWithPeriod = tasklist.map((task) => ({
    ...task,
    timePeriodInfo: getTimePeriod(task.time),
  }));

  // Sort by period order, then by time within period
  const sortedTasks = [...tasksWithPeriod].sort((a, b) => {
    if (a.timePeriodInfo.order !== b.timePeriodInfo.order) {
      return a.timePeriodInfo.order - b.timePeriodInfo.order;
    }
    // Sort by time within same period
    const timeA = a.time || '23:59';
    const timeB = b.time || '23:59';
    return timeA.localeCompare(timeB);
  });

  // Group by period label
  const groupedItems = [];
  let currentPeriodLabel = null;

  sortedTasks.forEach((task) => {
    const periodLabel = task.timePeriodInfo.label;

    if (periodLabel !== currentPeriodLabel) {
      currentPeriodLabel = periodLabel;
      groupedItems.push({ header: periodLabel });
    }

    // Remove temporary property and add to result
    const { timePeriodInfo, ...cleanTask } = task;
    groupedItems.push(cleanTask);
  });

  return groupedItems;
}

/**
 * Group goal items by taskRef for use in "Goal Task" dropdown (milestone parent selection)
 * This groups goal items and adds time information from the tasklist
 *
 * @param {Array} goalItems - Array of goal item objects with 'taskRef' property
 * @param {Array} tasklist - Array of routine tasks to look up names and times
 * @returns {Array} Grouped array with header objects
 *
 * @example
 * const grouped = groupGoalItemsByTaskRef(goalItems, tasklist);
 * // Result: [{ header: 'Morning Routine' }, { ...goalItem1, time: '08:00' }, ...]
 */
export function groupGoalItemsByTaskRef(goalItems, tasklist) {
  if (!goalItems || !Array.isArray(goalItems) || goalItems.length === 0) {
    return [];
  }

  const labelFn = (taskRef) => {
    if (!taskRef) return 'No Routine Task';
    const task = tasklist?.find((t) => t.id === taskRef || t.taskId === taskRef);
    return task?.name || `Unknown Task (${taskRef})`;
  };

  const itemTransform = (goalItem) => {
    const task = tasklist?.find((t) => t.id === goalItem.taskRef || t.taskId === goalItem.taskRef);
    return {
      ...goalItem,
      time: task?.time || '23:59',
    };
  };

  return groupItemsWithHeaders(goalItems, 'taskRef', labelFn, {
    sortByGroup: true,
    itemTransform,
  });
}

/**
 * Create a label function for goal items grouped by taskRef
 *
 * @param {Array} tasklist - Array of routine tasks to look up names
 * @returns {Function} Label function for use with groupItemsWithHeaders
 */
export function createTaskRefLabelFn(tasklist) {
  return (taskRef) => {
    if (!taskRef) return 'No Routine Task';
    const task = tasklist?.find((t) => t.id === taskRef || t.taskId === taskRef);
    return task?.name || `Unknown Task (${taskRef})`;
  };
}

/**
 * Add time from tasklist to goal items
 *
 * @param {Object} goalItem - Goal item to transform
 * @param {Array} tasklist - Array of routine tasks
 * @returns {Object} Goal item with time property
 */
export function addTimeFromTasklist(goalItem, tasklist) {
  const task = tasklist?.find((t) => t.id === goalItem.taskRef || t.taskId === goalItem.taskRef);
  return {
    ...goalItem,
    time: task?.time || '23:59',
  };
}

export default {
  groupItemsWithHeaders,
  groupTasksByTimePeriod,
  groupGoalItemsByTaskRef,
  createTaskRefLabelFn,
  addTimeFromTasklist,
};
