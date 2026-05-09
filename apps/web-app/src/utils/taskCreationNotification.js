import moment from 'moment';

/**
 * Notify when a task-mode goal item is added to a routine that is not the current task.
 *
 * @param {Object} params
 * @param {Object} params.vm - Vue instance (must expose $notify and $currentTaskData)
 * @param {Object} params.goalItemData - Created goal item payload
 * @param {Array} params.routines - Routines list to resolve routine metadata
 */
export function notifyNonCurrentTaskGoalCreation({ vm, goalItemData, routines = [] }) {
  const selectedTaskRef = goalItemData && goalItemData.taskRef;
  const currentTaskId = vm && vm.$currentTaskData && vm.$currentTaskData.id;

  // Only notify when task mode item is added to a non-current routine.
  if (!selectedTaskRef || !currentTaskId || selectedTaskRef === currentTaskId) {
    return;
  }

  const selectedRoutine = routines.find(
    (routine) => routine.id === selectedTaskRef || routine.taskId === selectedTaskRef,
  );

  if (!selectedRoutine || typeof vm.$notify !== 'function') {
    return;
  }

  const routineName = selectedRoutine.name || selectedRoutine.body || selectedRoutine.title || 'selected routine';
  const routineTime = selectedRoutine.time ? ` at ${selectedRoutine.time}` : '';
  const dateText = moment(goalItemData.date, 'DD-MM-YYYY', true).isValid()
    ? moment(goalItemData.date, 'DD-MM-YYYY').format('DD MMM YYYY')
    : goalItemData.date;

  vm.$notify({
    title: 'Task Added',
    text: `Added to ${routineName} on ${dateText}${routineTime}`,
    group: 'notify',
    type: 'success',
    duration: 4000,
  });
}
