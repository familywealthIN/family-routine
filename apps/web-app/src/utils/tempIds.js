/**
 * Id prefix of a subtask that exists only optimistically (see
 * `useGoalMutations.addSubTaskItem`). The server has never heard of it, so
 * nothing may be written against it until the real id lands.
 */
export const TEMP_SUBTASK_PREFIX = 'temp-subtask-';

export const isTempSubTaskId = (id) => String(id || '').startsWith(TEMP_SUBTASK_PREFIX);

export const tempSubTaskId = () => `${TEMP_SUBTASK_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
