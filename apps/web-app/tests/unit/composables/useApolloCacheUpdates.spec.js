/**
 * Unit tests for useApolloCacheUpdates composable
 * Tests Apollo cache update utilities for optimistic UI updates
 */

import {
    addGoalItemToCache,
    addMultipleGoalItemsToCache,
    updateGoalItemCompletionInCache,
    updateSubTaskCompletionInCache,
    deleteGoalItemFromCache,
    deleteSubTaskFromCache,
    updateRoutineTaskInCache,
    updateRoutineTaskMetricsInCache,
    updateRoutineTasklistInCache,
    cacheExists,
    readCacheSafely,
} from '@/composables/useApolloCacheUpdates';

import {
    DAILY_GOALS_QUERY,
    AGENDA_GOALS_QUERY,
    ROUTINE_DATE_QUERY,
} from '@/composables/graphql/queries';

describe('useApolloCacheUpdates', () => {
    let mockApolloClient;
    let mockCacheData;
    let consoleWarnSpy;
    let consoleLogSpy;

    // Helper: get today's date in DD-MM-YYYY format (matches getCurrentDayDate())
    function getTodayDate() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    }

    beforeEach(() => {
        // Use a Map for mockCacheData to support object keys (query documents)
        mockCacheData = new Map();

        mockApolloClient = {
            readQuery: jest.fn(({ query }) => mockCacheData.get(query) || null),
            writeQuery: jest.fn(),
        };

        // Spy on console methods
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ========================================================================
    // addGoalItemToCache
    // ========================================================================
    describe('addGoalItemToCache', () => {
        it('should add goal item to existing period goal in daily cache', () => {
            const date = '23-02-2026';
            const period = 'day';
            const goalItem = {
                id: 'goal-1',
                body: 'Test Goal',
                taskRef: 'task-1',
                progress: 0,
                isComplete: false,
            };

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'existing-goal',
                    date,
                    period,
                    goalItems: [],
                }],
            });

            const result = addGoalItemToCache(mockApolloClient, { goalItem, date, period });

            expect(result).toBe(true);
            expect(mockApolloClient.readQuery).toHaveBeenCalledWith({
                query: DAILY_GOALS_QUERY,
                variables: { date },
            });
            expect(mockApolloClient.writeQuery).toHaveBeenCalled();

            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.optimizedDailyGoals[0].goalItems).toHaveLength(1);
            expect(writeCall.data.optimizedDailyGoals[0].goalItems[0].body).toBe('Test Goal');
            expect(writeCall.data.optimizedDailyGoals[0].goalItems[0].__typename).toBe('GoalItem');
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Successfully added goal item'),
            );
        });

        it('should create new period goal if none exists for the date', () => {
            const dayDate = getTodayDate();
            const periodDate = '28-02-2026';
            const period = 'week';
            const goalItem = {
                id: 'goal-1',
                body: 'Week Goal',
                taskRef: 'task-1',
            };

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [],
            });

            const result = addGoalItemToCache(mockApolloClient, {
                goalItem, date: periodDate, period, dayDate,
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.agendaGoals).toHaveLength(1);
            expect(writeCall.data.agendaGoals[0].period).toBe('week');
            expect(writeCall.data.agendaGoals[0].goalItems[0].body).toBe('Week Goal');
        });

        it('should return false when cache data is null', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, null);

            const result = addGoalItemToCache(mockApolloClient, {
                goalItem: { id: '1', body: 'Test' },
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should update only AGENDA cache for non-day periods', () => {
            // Source intentionally writes only AGENDA_GOALS_QUERY for non-day
            // periods; the comment in getCacheTargets() notes that dual-writing
            // caused duplicate goals.
            const dayDate = '23-02-2026';
            const periodDate = '28-02-2026';
            const period = 'month';

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'existing',
                    date: periodDate,
                    period,
                    goalItems: [],
                }],
            });

            const result = addGoalItemToCache(mockApolloClient, {
                goalItem: { id: '1', body: 'Month Goal' },
                date: periodDate,
                period,
                dayDate,
            });

            expect(result).toBe(true);
            expect(mockApolloClient.readQuery).toHaveBeenCalledWith({
                query: AGENDA_GOALS_QUERY,
                variables: { date: dayDate },
            });
            expect(mockApolloClient.readQuery).not.toHaveBeenCalledWith({
                query: DAILY_GOALS_QUERY,
                variables: { date: dayDate },
            });
            expect(mockApolloClient.writeQuery).toHaveBeenCalledTimes(1);
        });

        it('should handle goal item with all optional fields', () => {
            const date = '23-02-2026';
            const goalItem = {
                id: 'goal-1',
                body: 'Complete Goal',
                taskRef: 'task-1',
                goalRef: 'parent-goal',
                progress: 50,
                isComplete: true,
                isMilestone: true,
                contribution: 'Made progress',
                reward: 'reward-1',
                tags: ['work', 'important'],
                status: 'done',
                completedAt: '2026-02-23T10:00:00.000Z',
                subTasks: [
                    { id: 'sub-1', body: 'Subtask 1', isComplete: true },
                    { id: 'sub-2', body: 'Subtask 2', isComplete: false },
                ],
            };

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'existing',
                    date,
                    period: 'day',
                    goalItems: [],
                }],
            });

            addGoalItemToCache(mockApolloClient, { goalItem, date, period: 'day' });

            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const addedItem = writeCall.data.optimizedDailyGoals[0].goalItems[0];

            expect(addedItem.progress).toBe(50);
            expect(addedItem.isComplete).toBe(true);
            expect(addedItem.isMilestone).toBe(true);
            expect(addedItem.tags).toEqual(['work', 'important']);
            expect(addedItem.subTasks).toHaveLength(2);
            expect(addedItem.subTasks[0].__typename).toBe('SubTaskItem');
        });

        it('should handle errors gracefully', () => {
            jest.spyOn(console, 'error').mockImplementation(() => { });
            mockApolloClient.readQuery.mockImplementation(() => {
                throw new Error('Cache read error');
            });

            const result = addGoalItemToCache(mockApolloClient, {
                goalItem: { id: '1', body: 'Test' },
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });
    });

    // ========================================================================
    // addMultipleGoalItemsToCache
    // ========================================================================
    describe('addMultipleGoalItemsToCache', () => {
        it('should add multiple goal items to cache', () => {
            const dayDate = getTodayDate();
            const periodDate = '28-02-2026';
            const period = 'week';
            const goalItems = [
                { id: 'goal-1', body: 'Goal 1', taskRef: 'task-1' },
                { id: 'goal-2', body: 'Goal 2', taskRef: 'task-2' },
                { id: 'goal-3', body: 'Goal 3', taskRef: 'task-3' },
            ];

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'existing',
                    date: periodDate,
                    period,
                    goalItems: [],
                }],
            });

            const result = addMultipleGoalItemsToCache(mockApolloClient, {
                goalItems,
                date: periodDate,
                period,
                dayDate,
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.agendaGoals[0].goalItems).toHaveLength(3);
            expect(writeCall.data.agendaGoals[0].goalItems[0].body).toBe('Goal 1');
            expect(writeCall.data.agendaGoals[0].goalItems[2].body).toBe('Goal 3');
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Successfully added 3 goal items to week cache'),
            );
        });

        it('should create new period goal when none exists', () => {
            const date = '23-02-2026';
            const period = 'day';
            const goalItems = [
                { id: 'goal-1', body: 'Goal 1', taskRef: 'task-1' },
            ];

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [],
            });

            const result = addMultipleGoalItemsToCache(mockApolloClient, {
                goalItems, date, period,
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.optimizedDailyGoals).toHaveLength(1);
            expect(writeCall.data.optimizedDailyGoals[0].period).toBe('day');
            expect(writeCall.data.optimizedDailyGoals[0].goalItems).toHaveLength(1);
        });

        it('should handle empty goal items array', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'existing',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [],
                }],
            });

            const result = addMultipleGoalItemsToCache(mockApolloClient, {
                goalItems: [],
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.optimizedDailyGoals[0].goalItems).toHaveLength(0);
        });

        it('should return false when cache is missing', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, null);

            const result = addMultipleGoalItemsToCache(mockApolloClient, {
                goalItems: [{ id: '1', body: 'Test' }],
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should handle writeQuery errors gracefully', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'existing',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [],
                }],
            });

            mockApolloClient.writeQuery.mockImplementation(() => {
                throw new Error('Cache write error');
            });

            const result = addMultipleGoalItemsToCache(mockApolloClient, {
                goalItems: [{ id: '1', body: 'Test' }],
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });
    });

    // ========================================================================
    // updateGoalItemCompletionInCache
    // ========================================================================
    describe('updateGoalItemCompletionInCache', () => {
        it('should update goal completion status in cache', () => {
            const date = '23-02-2026';
            const goalId = 'goal-1';

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date,
                    period: 'day',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: goalId,
                        body: 'Test Goal',
                        isComplete: false,
                        progress: 0,
                        status: 'todo',
                        completedAt: null,
                    }],
                }],
            });

            const result = updateGoalItemCompletionInCache(mockApolloClient, {
                id: goalId,
                isComplete: true,
                date,
                period: 'day',
                progress: 100,
                status: 'done',
                completedAt: '2026-02-23T10:00:00.000Z',
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const updatedItem = writeCall.data.optimizedDailyGoals[0].goalItems[0];

            expect(updatedItem.isComplete).toBe(true);
            expect(updatedItem.progress).toBe(100);
            expect(updatedItem.status).toBe('done');
            expect(updatedItem.completedAt).toBe('2026-02-23T10:00:00.000Z');
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Successfully updated goal item'),
            );
        });

        it('should return false when goal item not found', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{ id: 'other-goal', body: 'Other' }],
                }],
            });

            const result = updateGoalItemCompletionInCache(mockApolloClient, {
                id: 'non-existent',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should return false when period goal not found in cache', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'week',
                    goalItems: [{ id: 'goal-1', body: 'Goal 1' }],
                }],
            });

            const result = updateGoalItemCompletionInCache(mockApolloClient, {
                id: 'goal-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should return false when goalsKey missing from cache', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {});

            const result = updateGoalItemCompletionInCache(mockApolloClient, {
                id: 'goal-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should handle updates with partial data', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Test',
                        isComplete: false,
                    }],
                }],
            });

            updateGoalItemCompletionInCache(mockApolloClient, {
                id: 'goal-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const updatedItem = writeCall.data.optimizedDailyGoals[0].goalItems[0];

            expect(updatedItem.isComplete).toBe(true);
            expect(updatedItem.progress).toBeUndefined();
            expect(updatedItem.status).toBeUndefined();
        });

        it('should handle writeQuery errors gracefully', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Test',
                        isComplete: false,
                    }],
                }],
            });

            mockApolloClient.writeQuery.mockImplementation(() => {
                throw new Error('Cache write error');
            });

            const result = updateGoalItemCompletionInCache(mockApolloClient, {
                id: 'goal-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });
    });

    // ========================================================================
    // updateSubTaskCompletionInCache
    // ========================================================================
    describe('updateSubTaskCompletionInCache', () => {
        it('should update subtask and recalculate parent progress', () => {
            const date = '23-02-2026';
            const goalId = 'goal-1';
            const subTaskId = 'sub-1';

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date,
                    period: 'day',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: goalId,
                        body: 'Parent Goal',
                        progress: 0,
                        subTasks: [
                            { __typename: 'SubTaskItem', id: 'sub-1', body: 'Subtask 1', isComplete: false },
                            { __typename: 'SubTaskItem', id: 'sub-2', body: 'Subtask 2', isComplete: false },
                            { __typename: 'SubTaskItem', id: 'sub-3', body: 'Subtask 3', isComplete: false },
                        ],
                    }],
                }],
            });

            const result = updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: goalId,
                subTaskId,
                isComplete: true,
                date,
                period: 'day',
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const updatedGoal = writeCall.data.optimizedDailyGoals[0].goalItems[0];

            expect(updatedGoal.subTasks[0].isComplete).toBe(true);
            expect(updatedGoal.progress).toBeCloseTo(33.33, 1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Successfully updated subtask'),
            );
        });

        it('should calculate 100% progress when all subtasks complete', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Parent Goal',
                        progress: 66.67,
                        subTasks: [
                            { __typename: 'SubTaskItem', id: 'sub-1', body: 'Subtask 1', isComplete: true },
                            { __typename: 'SubTaskItem', id: 'sub-2', body: 'Subtask 2', isComplete: true },
                            { __typename: 'SubTaskItem', id: 'sub-3', body: 'Subtask 3', isComplete: false },
                        ],
                    }],
                }],
            });

            updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'goal-1',
                subTaskId: 'sub-3',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const updatedGoal = writeCall.data.optimizedDailyGoals[0].goalItems[0];

            expect(updatedGoal.progress).toBe(100);
        });

        it('should set status to progress when some subtasks complete', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Parent Goal',
                        progress: 33.33,
                        status: 'todo',
                        subTasks: [
                            { __typename: 'SubTaskItem', id: 'sub-1', body: 'Subtask 1', isComplete: false },
                            { __typename: 'SubTaskItem', id: 'sub-2', body: 'Subtask 2', isComplete: false },
                            { __typename: 'SubTaskItem', id: 'sub-3', body: 'Subtask 3', isComplete: false },
                        ],
                    }],
                }],
            });

            updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'goal-1',
                subTaskId: 'sub-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const updatedGoal = writeCall.data.optimizedDailyGoals[0].goalItems[0];

            expect(updatedGoal.status).toBe('progress');
            expect(updatedGoal.progress).toBeCloseTo(33.33, 1);
        });

        it('should handle goal with empty subTasks array', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Parent Goal',
                        progress: 0,
                        subTasks: [],
                    }],
                }],
            });

            const result = updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'goal-1',
                subTaskId: 'sub-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should return false when parent goal not found', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{ id: 'other-goal', subTasks: [] }],
                }],
            });

            const result = updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'non-existent',
                subTaskId: 'sub-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should return false when goal item has no subTasks property', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{ id: 'goal-1', body: 'Goal without subTasks' }],
                }],
            });

            const result = updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'goal-1',
                subTaskId: 'sub-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should return false when period goal not found in cache', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'week',
                    goalItems: [{ id: 'goal-1', subTasks: [] }],
                }],
            });

            const result = updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'goal-1',
                subTaskId: 'sub-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should return false when goalsKey missing from cache', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {});

            const result = updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'goal-1',
                subTaskId: 'sub-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should return false when subtask not found', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{
                        id: 'goal-1',
                        subTasks: [
                            { id: 'sub-1', body: 'Subtask 1', isComplete: false },
                        ],
                    }],
                }],
            });

            const result = updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'goal-1',
                subTaskId: 'non-existent-sub',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should handle writeQuery errors gracefully', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [{
                        id: 'goal-1',
                        subTasks: [
                            { id: 'sub-1', body: 'Subtask 1', isComplete: false },
                        ],
                    }],
                }],
            });

            mockApolloClient.writeQuery.mockImplementation(() => {
                throw new Error('Cache write error');
            });

            const result = updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'goal-1',
                subTaskId: 'sub-1',
                isComplete: true,
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });
    });

    // ========================================================================
    // deleteGoalItemFromCache
    // ========================================================================
    describe('deleteGoalItemFromCache', () => {
        it('should remove goal item from cache', () => {
            const date = '23-02-2026';
            const goalIdToDelete = 'goal-2';

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date,
                    period: 'day',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                        { __typename: 'GoalItem', id: 'goal-2', body: 'Goal 2' },
                        { __typename: 'GoalItem', id: 'goal-3', body: 'Goal 3' },
                    ],
                }],
            });

            const result = deleteGoalItemFromCache(mockApolloClient, {
                id: goalIdToDelete,
                date,
                period: 'day',
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.optimizedDailyGoals[0].goalItems).toHaveLength(2);
            expect(writeCall.data.optimizedDailyGoals[0].goalItems[0].id).toBe('goal-1');
            expect(writeCall.data.optimizedDailyGoals[0].goalItems[1].id).toBe('goal-3');
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Successfully deleted goal item'),
            );
        });

        it('should handle deletion when goal not found', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                    ],
                }],
            });

            const result = deleteGoalItemFromCache(mockApolloClient, {
                id: 'non-existent',
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.optimizedDailyGoals[0].goalItems).toHaveLength(1);
        });

        it('should return false when cache is null', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, null);

            const result = deleteGoalItemFromCache(mockApolloClient, {
                id: 'goal-1',
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should return false when period goal not found in cache', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'week',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                    ],
                }],
            });

            const result = deleteGoalItemFromCache(mockApolloClient, {
                id: 'goal-1',
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should handle writeQuery errors gracefully', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '23-02-2026',
                    period: 'day',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                    ],
                }],
            });

            mockApolloClient.writeQuery.mockImplementation(() => {
                throw new Error('Cache write error');
            });

            const result = deleteGoalItemFromCache(mockApolloClient, {
                id: 'goal-1',
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });
    });

    // ========================================================================
    // deleteSubTaskFromCache
    // ========================================================================
    describe('deleteSubTaskFromCache', () => {
        it('should delete sub-task from day cache', () => {
            const date = '23-02-2026';

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date,
                    period: 'day',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Goal 1',
                        progress: 50,
                        subTasks: [
                            { __typename: 'SubTaskItem', id: 'st-1', body: 'Sub 1', isComplete: true },
                            { __typename: 'SubTaskItem', id: 'st-2', body: 'Sub 2', isComplete: false },
                        ],
                    }],
                }],
            });

            const result = deleteSubTaskFromCache(mockApolloClient, {
                subTaskId: 'st-1',
                goalItemId: 'goal-1',
                date,
                period: 'day',
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const goalItem = writeCall.data.optimizedDailyGoals[0].goalItems[0];
            expect(goalItem.subTasks).toHaveLength(1);
            expect(goalItem.subTasks[0].id).toBe('st-2');
            expect(goalItem.progress).toBe(0);
        });

        it('should update only AGENDA cache for non-day period', () => {
            const dayDate = '23-02-2026';
            const periodDate = '28-02-2026';

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: periodDate,
                    period: 'week',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Goal 1',
                        progress: 50,
                        subTasks: [
                            { __typename: 'SubTaskItem', id: 'st-1', body: 'Sub 1', isComplete: true },
                            { __typename: 'SubTaskItem', id: 'st-2', body: 'Sub 2', isComplete: false },
                        ],
                    }],
                }],
            });

            const result = deleteSubTaskFromCache(mockApolloClient, {
                subTaskId: 'st-1',
                goalItemId: 'goal-1',
                date: periodDate,
                period: 'week',
                dayDate,
            });

            expect(result).toBe(true);
            expect(mockApolloClient.writeQuery).toHaveBeenCalledTimes(1);
        });

        it('should return false when cache is null', () => {
            const result = deleteSubTaskFromCache(mockApolloClient, {
                subTaskId: 'st-1',
                goalItemId: 'goal-1',
                date: '23-02-2026',
                period: 'day',
            });

            expect(result).toBe(false);
        });

        it('should set progress to 0 when last sub-task is deleted', () => {
            const date = '23-02-2026';

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date,
                    period: 'day',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Goal 1',
                        progress: 100,
                        subTasks: [
                            { __typename: 'SubTaskItem', id: 'st-1', body: 'Sub 1', isComplete: true },
                        ],
                    }],
                }],
            });

            deleteSubTaskFromCache(mockApolloClient, {
                subTaskId: 'st-1',
                goalItemId: 'goal-1',
                date,
                period: 'day',
            });

            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const goalItem = writeCall.data.optimizedDailyGoals[0].goalItems[0];
            expect(goalItem.subTasks).toHaveLength(0);
            expect(goalItem.progress).toBe(0);
        });
    });

    // ========================================================================
    // single-cache updates for non-day periods
    //   Source intentionally writes only to AGENDA_GOALS_QUERY for non-day
    //   periods — see comment in getCacheTargets() about the dual-write
    //   regression that produced duplicate goals.
    // ========================================================================
    describe('single-cache updates for non-day periods', () => {
        it('deleteGoalItemFromCache writes only the AGENDA cache for week period', () => {
            const dayDate = '23-02-2026';
            const periodDate = '28-02-2026';

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: periodDate,
                    period: 'week',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                    ],
                }],
            });

            const result = deleteGoalItemFromCache(mockApolloClient, {
                id: 'goal-1',
                date: periodDate,
                period: 'week',
                dayDate,
            });

            expect(result).toBe(true);
            expect(mockApolloClient.writeQuery).toHaveBeenCalledTimes(1);

            const agendaWrite = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(agendaWrite.query).toBe(AGENDA_GOALS_QUERY);
            expect(agendaWrite.data.agendaGoals[0].goalItems).toHaveLength(0);
        });

        it('updateGoalItemCompletionInCache writes only the AGENDA cache for month period', () => {
            const dayDate = '23-02-2026';
            const periodDate = '28-02-2026';

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: periodDate,
                    period: 'month',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Goal 1',
                        isComplete: false,
                        progress: 0,
                        status: 'todo',
                        completedAt: null,
                    }],
                }],
            });

            const result = updateGoalItemCompletionInCache(mockApolloClient, {
                id: 'goal-1',
                isComplete: true,
                date: periodDate,
                period: 'month',
                progress: 100,
                status: 'done',
                completedAt: '2026-02-23',
                dayDate,
            });

            expect(result).toBe(true);
            expect(mockApolloClient.writeQuery).toHaveBeenCalledTimes(1);
        });

        it('updateSubTaskCompletionInCache writes only the AGENDA cache for week period', () => {
            const dayDate = '23-02-2026';
            const periodDate = '28-02-2026';

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: periodDate,
                    period: 'week',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Goal 1',
                        isComplete: false,
                        progress: 0,
                        status: 'todo',
                        subTasks: [
                            { __typename: 'SubTaskItem', id: 'st-1', body: 'Sub 1', isComplete: false },
                            { __typename: 'SubTaskItem', id: 'st-2', body: 'Sub 2', isComplete: false },
                        ],
                    }],
                }],
            });

            const result = updateSubTaskCompletionInCache(mockApolloClient, {
                goalItemId: 'goal-1',
                subTaskId: 'st-1',
                isComplete: true,
                date: periodDate,
                period: 'week',
                dayDate,
            });

            expect(result).toBe(true);
            expect(mockApolloClient.writeQuery).toHaveBeenCalledTimes(1);
        });

        it('should succeed if only one cache exists for non-day period', () => {
            const dayDate = '23-02-2026';
            const periodDate = '28-02-2026';

            // Only AGENDA cache exists, DAILY cache is null
            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: periodDate,
                    period: 'week',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                    ],
                }],
            });
            mockCacheData.set(DAILY_GOALS_QUERY, null);

            const result = deleteGoalItemFromCache(mockApolloClient, {
                id: 'goal-1',
                date: periodDate,
                period: 'week',
                dayDate,
            });

            expect(result).toBe(true);
            expect(mockApolloClient.writeQuery).toHaveBeenCalledTimes(1);
        });

        it('should only use DAILY cache for day period', () => {
            const date = '23-02-2026';

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date,
                    period: 'day',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                    ],
                }],
            });

            deleteGoalItemFromCache(mockApolloClient, {
                id: 'goal-1',
                date,
                period: 'day',
            });

            // Should only read/write DAILY cache, not AGENDA
            expect(mockApolloClient.readQuery).toHaveBeenCalledTimes(1);
            expect(mockApolloClient.readQuery).toHaveBeenCalledWith({
                query: DAILY_GOALS_QUERY,
                variables: { date },
            });
        });
    });

    // ========================================================================
    // dayDate vs period date: cache key resolution
    // ========================================================================
    describe('dayDate cache key resolution', () => {
        it('should use dayDate for the AGENDA query when period is week', () => {
            const dayDate = '23-02-2026';
            const periodDate = '28-02-2026';

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: periodDate,
                    period: 'week',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                    ],
                }],
            });

            deleteGoalItemFromCache(mockApolloClient, {
                id: 'goal-1',
                date: periodDate,
                period: 'week',
                dayDate,
            });

            // Source uses dayDate as the cache key for AGENDA on non-day periods
            // (useDayDate=true). DAILY_GOALS_QUERY is not touched.
            expect(mockApolloClient.readQuery).toHaveBeenCalledWith({
                query: AGENDA_GOALS_QUERY,
                variables: { date: dayDate },
            });
            expect(mockApolloClient.readQuery).not.toHaveBeenCalledWith({
                query: DAILY_GOALS_QUERY,
                variables: expect.anything(),
            });

            const agendaWrite = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(agendaWrite.query).toBe(AGENDA_GOALS_QUERY);
            expect(agendaWrite.variables).toEqual({ date: dayDate });
        });

        it('should use period date for day period (no dayDate override)', () => {
            const date = '23-02-2026';

            mockCacheData.set(DAILY_GOALS_QUERY, {
                optimizedDailyGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date,
                    period: 'day',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                    ],
                }],
            });

            deleteGoalItemFromCache(mockApolloClient, {
                id: 'goal-1',
                date,
                period: 'day',
                dayDate: '99-99-9999', // Should be ignored for day period
            });

            // Should use the period date, NOT dayDate
            expect(mockApolloClient.readQuery).toHaveBeenCalledWith({
                query: DAILY_GOALS_QUERY,
                variables: { date },
            });
        });

        it('should fallback to getCurrentDayDate when dayDate not provided for non-day', () => {
            const todayDate = getTodayDate();

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: '28-02-2026',
                    period: 'week',
                    goalItems: [
                        { __typename: 'GoalItem', id: 'goal-1', body: 'Goal 1' },
                    ],
                }],
            });

            deleteGoalItemFromCache(mockApolloClient, {
                id: 'goal-1',
                date: '28-02-2026',
                period: 'week',
                // No dayDate provided
            });

            // Should use today's date as fallback
            expect(mockApolloClient.readQuery).toHaveBeenCalledWith({
                query: AGENDA_GOALS_QUERY,
                variables: { date: todayDate },
            });
        });

        it('should use dayDate for addGoalItemToCache on non-day periods', () => {
            const dayDate = '23-02-2026';
            const periodDate = '28-02-2026';

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [],
            });

            addGoalItemToCache(mockApolloClient, {
                goalItem: { id: 'g1', body: 'Week Goal' },
                date: periodDate,
                period: 'week',
                dayDate,
            });

            expect(mockApolloClient.readQuery).toHaveBeenCalledWith({
                query: AGENDA_GOALS_QUERY,
                variables: { date: dayDate },
            });
        });

        it('should use dayDate for updateGoalItemCompletionInCache on non-day periods', () => {
            const dayDate = '23-02-2026';
            const periodDate = '28-02-2026';

            mockCacheData.set(AGENDA_GOALS_QUERY, {
                agendaGoals: [{
                    __typename: 'Goal',
                    id: 'goal-group',
                    date: periodDate,
                    period: 'month',
                    goalItems: [{
                        __typename: 'GoalItem',
                        id: 'goal-1',
                        body: 'Month Goal',
                        isComplete: false,
                        progress: 0,
                    }],
                }],
            });

            updateGoalItemCompletionInCache(mockApolloClient, {
                id: 'goal-1',
                isComplete: true,
                date: periodDate,
                period: 'month',
                dayDate,
            });

            expect(mockApolloClient.readQuery).toHaveBeenCalledWith({
                query: AGENDA_GOALS_QUERY,
                variables: { date: dayDate },
            });
        });
    });

    // ========================================================================
    // updateRoutineTaskInCache
    // ========================================================================
    describe('updateRoutineTaskInCache', () => {
        it('should update task ticked status', () => {
            const date = '23-02-2026';
            const taskId = 'task-1';

            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date,
                    tasklist: [
                        { __typename: 'Task', id: 'task-1', name: 'Task 1', ticked: false },
                        { __typename: 'Task', id: 'task-2', name: 'Task 2', ticked: false },
                    ],
                },
            });

            const result = updateRoutineTaskInCache(mockApolloClient, {
                date, taskId, ticked: true,
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const updatedTask = writeCall.data.routineDate.tasklist.find((t) => t.id === taskId);

            expect(updatedTask.ticked).toBe(true);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Successfully updated task'),
            );
        });

        it('should update task passed status', () => {
            const date = '23-02-2026';
            const taskId = 'task-1';

            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date,
                    tasklist: [
                        { __typename: 'Task', id: 'task-1', name: 'Task 1', passed: false },
                    ],
                },
            });

            updateRoutineTaskInCache(mockApolloClient, {
                date, taskId, passed: true,
            });

            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.routineDate.tasklist[0].passed).toBe(true);
        });

        it('should update task wait status', () => {
            const date = '23-02-2026';
            const taskId = 'task-1';

            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date,
                    tasklist: [
                        { __typename: 'Task', id: 'task-1', name: 'Task 1', wait: true },
                    ],
                },
            });

            updateRoutineTaskInCache(mockApolloClient, {
                date, taskId, wait: false,
            });

            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.routineDate.tasklist[0].wait).toBe(false);
        });

        it('should return false when routine not found', () => {
            mockCacheData.set(ROUTINE_DATE_QUERY, null);

            const result = updateRoutineTaskInCache(mockApolloClient, {
                date: '23-02-2026',
                taskId: 'task-1',
                ticked: true,
            });

            expect(result).toBe(false);
            expect(consoleWarnSpy).toHaveBeenCalled();
        });

        it('should return false when task not found', () => {
            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date: '23-02-2026',
                    tasklist: [
                        { __typename: 'Task', id: 'other-task', name: 'Other' },
                    ],
                },
            });

            const result = updateRoutineTaskInCache(mockApolloClient, {
                date: '23-02-2026',
                taskId: 'non-existent',
                ticked: true,
            });

            expect(result).toBe(false);
            expect(consoleWarnSpy).toHaveBeenCalled();
        });

        it('should handle writeQuery errors gracefully', () => {
            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date: '23-02-2026',
                    tasklist: [
                        { __typename: 'Task', id: 'task-1', name: 'Task 1', ticked: false },
                    ],
                },
            });

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            mockApolloClient.writeQuery.mockImplementation(() => {
                throw new Error('Cache write error');
            });

            const result = updateRoutineTaskInCache(mockApolloClient, {
                date: '23-02-2026',
                taskId: 'task-1',
                ticked: true,
            });

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[updateRoutineTaskInCache] Error updating cache:',
                expect.any(Error),
            );

            consoleErrorSpy.mockRestore();
        });
    });

    // ========================================================================
    // updateRoutineTaskMetricsInCache
    // ========================================================================
    describe('updateRoutineTaskMetricsInCache', () => {
        it('should update task stimuli metrics', () => {
            const date = '23-02-2026';
            const taskId = 'task-1';
            const newStimuli = [
                { __typename: 'Stimulus', name: 'D', splitRate: 1, earned: 10 },
                { __typename: 'Stimulus', name: 'K', splitRate: 0.5, earned: 5 },
            ];

            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date,
                    tasklist: [{
                        __typename: 'Task',
                        id: taskId,
                        name: 'Task 1',
                        stimuli: [
                            { __typename: 'Stimulus', name: 'D', splitRate: 1, earned: 0 },
                        ],
                    }],
                },
            });

            const result = updateRoutineTaskMetricsInCache(mockApolloClient, {
                taskId, date, stimuli: newStimuli,
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const updatedTask = writeCall.data.routineDate.tasklist[0];

            expect(updatedTask.stimuli).toHaveLength(2);
            expect(updatedTask.stimuli[0].earned).toBe(10);
            expect(updatedTask.stimuli[1].earned).toBe(5);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Successfully updated metrics for task'),
            );
        });

        it('should return false when cache is null', () => {
            mockCacheData.set(ROUTINE_DATE_QUERY, null);

            const result = updateRoutineTaskMetricsInCache(mockApolloClient, {
                taskId: 'task-1',
                date: '23-02-2026',
                stimuli: [],
            });

            expect(result).toBe(false);
            expect(consoleWarnSpy).toHaveBeenCalled();
        });

        it('should return false when task not found in tasklist', () => {
            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date: '23-02-2026',
                    tasklist: [
                        { __typename: 'Task', id: 'other-task', name: 'Other Task' },
                    ],
                },
            });

            const result = updateRoutineTaskMetricsInCache(mockApolloClient, {
                taskId: 'non-existent-task',
                date: '23-02-2026',
                stimuli: [{ name: 'D', splitRate: 1, earned: 10 }],
            });

            expect(result).toBe(false);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[updateRoutineTaskMetricsInCache] Task non-existent-task not found',
            );
        });

        it('should handle null stimuli parameter', () => {
            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date: '23-02-2026',
                    tasklist: [{
                        __typename: 'Task',
                        id: 'task-1',
                        name: 'Task 1',
                        stimuli: [],
                    }],
                },
            });

            const result = updateRoutineTaskMetricsInCache(mockApolloClient, {
                taskId: 'task-1',
                date: '23-02-2026',
                stimuli: null,
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            const updatedTask = writeCall.data.routineDate.tasklist[0];
            expect(updatedTask.stimuli).toEqual([]);
        });

        it('should handle writeQuery errors gracefully', () => {
            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date: '23-02-2026',
                    tasklist: [{
                        __typename: 'Task',
                        id: 'task-1',
                        name: 'Task 1',
                        stimuli: [],
                    }],
                },
            });

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            mockApolloClient.writeQuery.mockImplementation(() => {
                throw new Error('Cache write error');
            });

            const result = updateRoutineTaskMetricsInCache(mockApolloClient, {
                taskId: 'task-1',
                date: '23-02-2026',
                stimuli: [{ name: 'D', splitRate: 1, earned: 10 }],
            });

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[updateRoutineTaskMetricsInCache] Error updating cache:',
                expect.any(Error),
            );

            consoleErrorSpy.mockRestore();
        });
    });

    // ========================================================================
    // updateRoutineTasklistInCache
    // ========================================================================
    describe('updateRoutineTasklistInCache', () => {
        it('should replace entire tasklist', () => {
            const date = '23-02-2026';
            const newTasklist = [
                { __typename: 'Task', id: 'task-1', name: 'New Task 1', ticked: true },
                { __typename: 'Task', id: 'task-2', name: 'New Task 2', ticked: false },
            ];

            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date,
                    tasklist: [
                        { __typename: 'Task', id: 'old-task', name: 'Old Task' },
                    ],
                },
            });

            const result = updateRoutineTasklistInCache(mockApolloClient, {
                date, tasklist: newTasklist,
            });

            expect(result).toBe(true);
            const writeCall = mockApolloClient.writeQuery.mock.calls[0][0];
            expect(writeCall.data.routineDate.tasklist).toHaveLength(2);
            expect(writeCall.data.routineDate.tasklist[0].name).toBe('New Task 1');
            expect(writeCall.data.routineDate.tasklist[1].ticked).toBe(false);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Successfully updated complete tasklist'),
            );
        });

        it('should return false when cache is null', () => {
            mockCacheData.set(ROUTINE_DATE_QUERY, null);

            const result = updateRoutineTasklistInCache(mockApolloClient, {
                date: '23-02-2026',
                tasklist: [],
            });

            expect(result).toBe(false);
            expect(consoleWarnSpy).toHaveBeenCalled();
        });

        it('should handle writeQuery errors gracefully', () => {
            mockCacheData.set(ROUTINE_DATE_QUERY, {
                routineDate: {
                    __typename: 'Routine',
                    id: 'routine-1',
                    date: '23-02-2026',
                    tasklist: [
                        { __typename: 'Task', id: 'old-task', name: 'Old Task' },
                    ],
                },
            });

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            mockApolloClient.writeQuery.mockImplementation(() => {
                throw new Error('Cache write error');
            });

            const result = updateRoutineTasklistInCache(mockApolloClient, {
                date: '23-02-2026',
                tasklist: [
                    { __typename: 'Task', id: 'task-1', name: 'New Task 1', ticked: true },
                ],
            });

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[updateRoutineTasklistInCache] Error updating cache:',
                expect.any(Error),
            );

            consoleErrorSpy.mockRestore();
        });
    });

    // ========================================================================
    // cacheExists
    // ========================================================================
    describe('cacheExists', () => {
        it('should return true when cache exists', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, { optimizedDailyGoals: [] });

            const exists = cacheExists(mockApolloClient, DAILY_GOALS_QUERY, { date: '23-02-2026' });

            expect(exists).toBe(true);
        });

        it('should return false when cache is null', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, null);

            const exists = cacheExists(mockApolloClient, DAILY_GOALS_QUERY, { date: '23-02-2026' });

            expect(exists).toBe(false);
        });

        it('should return false on error', () => {
            mockApolloClient.readQuery.mockImplementation(() => {
                throw new Error('Cache error');
            });

            const exists = cacheExists(mockApolloClient, DAILY_GOALS_QUERY, { date: '23-02-2026' });

            expect(exists).toBe(false);
        });
    });

    // ========================================================================
    // readCacheSafely
    // ========================================================================
    describe('readCacheSafely', () => {
        it('should return cache data when it exists', () => {
            const mockData = { optimizedDailyGoals: [] };
            mockCacheData.set(DAILY_GOALS_QUERY, mockData);

            const result = readCacheSafely(mockApolloClient, DAILY_GOALS_QUERY, { date: '23-02-2026' });

            expect(result).toEqual(mockData);
        });

        it('should return null fallback when cache is null', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, null);

            const result = readCacheSafely(mockApolloClient, DAILY_GOALS_QUERY, { date: '23-02-2026' });

            expect(result).toBe(null);
        });

        it('should return custom fallback when provided', () => {
            mockCacheData.set(DAILY_GOALS_QUERY, null);
            const customFallback = { optimizedDailyGoals: [] };

            const result = readCacheSafely(
                mockApolloClient,
                DAILY_GOALS_QUERY,
                { date: '23-02-2026' },
                customFallback,
            );

            expect(result).toEqual(customFallback);
        });

        it('should return fallback on error', () => {
            mockApolloClient.readQuery.mockImplementation(() => {
                throw new Error('Cache read error');
            });

            const result = readCacheSafely(mockApolloClient, DAILY_GOALS_QUERY, { date: '23-02-2026' });

            expect(result).toBe(null);
        });
    });
});
