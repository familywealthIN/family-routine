import intelligentRefreshMixin from '@/mixins/intelligentRefreshMixin';

// Use jest fake timers + setSystemTime to control both Date and moment()
const MOCK_DATE = new Date('2025-12-22T10:30:00');

describe('intelligentRefreshMixin', () => {
  let vm;

  /**
   * Create a fake VM with all mixin methods bound to it,
   * so internal calls like this.stopIntelligentRefresh() work.
   */
  function createVm(overrides = {}) {
    const context = {
      ...intelligentRefreshMixin.data(),
      tasklist: null,
      todayDate: undefined,
      date: undefined,
      $apollo: null,
      ...overrides,
    };

    // Attach all mixin methods to the context so this.method() works
    Object.keys(intelligentRefreshMixin.methods).forEach((name) => {
      context[name] = intelligentRefreshMixin.methods[name].bind(context);
    });

    return context;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATE);
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    vm = createVm();
  });

  afterEach(() => {
    // Clean up any running timers
    if (vm.refreshTimerId) {
      clearInterval(vm.refreshTimerId);
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('data', () => {
    it('has correct default values', () => {
      const data = intelligentRefreshMixin.data();
      expect(data.refreshTimerId).toBeNull();
      expect(data.lastRefreshDate).toBeNull();
      expect(data.refreshInterval).toBe(30000);
      expect(data.isRefreshActive).toBe(false);
      expect(data.onDayChangeCallback).toBeNull();
      expect(data.onRoutineCheckCallback).toBeNull();
    });
  });

  describe('startIntelligentRefresh', () => {
    it('starts refresh with default options', () => {
      vm.startIntelligentRefresh();

      expect(vm.isRefreshActive).toBe(true);
      expect(vm.lastRefreshDate).toBe('22-12-2025');
      expect(vm.refreshInterval).toBe(30000);
      expect(vm.refreshTimerId).not.toBeNull();
    });

    it('uses custom interval', () => {
      vm.startIntelligentRefresh({ interval: 60000 });
      expect(vm.refreshInterval).toBe(60000);
    });

    it('stores callbacks', () => {
      const onDayChange = jest.fn();
      const onRoutineCheck = jest.fn();
      vm.startIntelligentRefresh({ onDayChange, onRoutineCheck });

      expect(vm.onDayChangeCallback).toBe(onDayChange);
      expect(vm.onRoutineCheckCallback).toBe(onRoutineCheck);
    });

    it('clears existing timer before starting new one', () => {
      vm.startIntelligentRefresh();
      const firstTimerId = vm.refreshTimerId;

      vm.startIntelligentRefresh();
      expect(vm.refreshTimerId).not.toBe(firstTimerId);
    });

    it('fires performIntelligentRefresh on interval tick', () => {
      vm.lastRefreshDate = '22-12-2025';
      vm.tasklist = null;
      vm.startIntelligentRefresh({ interval: 30000 });

      // Advance time by 30s to trigger the setInterval callback
      jest.advanceTimersByTime(30000);

      // performIntelligentRefresh was called — no day change, no onRoutineCheck,
      // falls through to checkRoutineItemsForRefresh (which returns early on null tasklist)
      // If it ran without errors, the callback was executed.
      expect(vm.isRefreshActive).toBe(true);
    });
  });

  describe('stopIntelligentRefresh', () => {
    it('clears timer and marks inactive', () => {
      vm.startIntelligentRefresh();
      expect(vm.refreshTimerId).not.toBeNull();

      vm.stopIntelligentRefresh();
      expect(vm.refreshTimerId).toBeNull();
      expect(vm.isRefreshActive).toBe(false);
    });

    it('does nothing if no timer is running', () => {
      expect(vm.refreshTimerId).toBeNull();
      vm.stopIntelligentRefresh(); // Should not throw
      expect(vm.refreshTimerId).toBeNull();
    });
  });

  describe('performIntelligentRefresh', () => {
    it('detects day change and calls onDayChange callback', () => {
      vm.lastRefreshDate = '21-12-2025'; // yesterday
      vm.$apollo = { queries: {} };

      const onDayChange = jest.fn();
      vm.performIntelligentRefresh(onDayChange, null);

      expect(vm.lastRefreshDate).toBe('22-12-2025');
      expect(onDayChange).toHaveBeenCalledWith('22-12-2025');
    });

    it('updates todayDate on day change when defined', () => {
      vm.lastRefreshDate = '21-12-2025';
      vm.todayDate = '21-12-2025';
      vm.$apollo = { queries: {} };

      vm.performIntelligentRefresh(null, null);

      expect(vm.todayDate).toBe('22-12-2025');
    });

    it('updates date on day change when it differs', () => {
      vm.lastRefreshDate = '21-12-2025';
      vm.date = '21-12-2025';
      vm.$apollo = { queries: {} };

      vm.performIntelligentRefresh(null, null);

      expect(vm.date).toBe('22-12-2025');
    });

    it('does not update date when date matches currentDate', () => {
      vm.lastRefreshDate = '21-12-2025';
      vm.date = '22-12-2025'; // already today
      vm.$apollo = { queries: {} };

      vm.performIntelligentRefresh(null, null);

      expect(vm.date).toBe('22-12-2025');
    });

    it('calls onRoutineCheck when day has not changed', () => {
      vm.lastRefreshDate = '22-12-2025'; // same day
      const onRoutineCheck = jest.fn();
      vm.performIntelligentRefresh(null, onRoutineCheck);

      expect(onRoutineCheck).toHaveBeenCalled();
    });

    it('falls back to checkRoutineItemsForRefresh when no onRoutineCheck', () => {
      vm.lastRefreshDate = '22-12-2025';
      vm.tasklist = null;

      // Should not throw
      vm.performIntelligentRefresh(null, null);
    });
  });

  describe('checkRoutineItemsForRefresh', () => {
    it('returns early when tasklist is null', () => {
      vm.tasklist = null;
      vm.checkRoutineItemsForRefresh(); // Should not throw
    });

    it('returns early when tasklist is not an array', () => {
      vm.tasklist = 'not-an-array';
      vm.checkRoutineItemsForRefresh(); // Should not throw
    });

    it('triggers refresh when task is within 60 min window', () => {
      // mockNow is 10:30, and task at 11:00 is 30 min away → within 60 min
      vm = createVm({
        tasklist: [
          {
            name: 'Morning Task', time: '11:00', ticked: false, passed: false,
          },
        ],
        $apollo: { queries: {} },
      });

      vm.checkRoutineItemsForRefresh();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Intelligent refresh triggered'),
      );
    });

    it('does not trigger for tasks outside window', () => {
      vm = createVm({
        tasklist: [
          {
            name: 'Evening Task', time: '18:00', ticked: false, passed: false,
          },
        ],
      });

      vm.checkRoutineItemsForRefresh();
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Intelligent refresh triggered'),
      );
    });

    it('skips ticked tasks', () => {
      vm = createVm({
        tasklist: [
          {
            name: 'Done Task', time: '10:45', ticked: true, passed: false,
          },
        ],
      });

      vm.checkRoutineItemsForRefresh();
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Intelligent refresh triggered'),
      );
    });

    it('skips passed tasks', () => {
      vm = createVm({
        tasklist: [
          {
            name: 'Passed Task', time: '10:45', ticked: false, passed: true,
          },
        ],
      });

      vm.checkRoutineItemsForRefresh();
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Intelligent refresh triggered'),
      );
    });

    it('handles task recently started (negative minutes within -30)', () => {
      // mockNow is 10:30, task at 10:15 is -15 min → within -30..0
      vm = createVm({
        tasklist: [
          {
            name: 'Recent Task', time: '10:15', ticked: false, passed: false,
          },
        ],
        $apollo: { queries: {} },
      });

      vm.checkRoutineItemsForRefresh();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Intelligent refresh triggered'),
      );
    });

    it('adjusts refresh interval when upcoming task is closer than current interval', () => {
      // mockNow is 10:30, task at 10:35 is 5 min away → nextRefreshIn = 5*60*1000 = 300000
      // But refreshInterval default is 30000, so nextRefreshIn (300000) > refreshInterval (30000)
      // Use a task at 10:31 → 1 min → nextRefreshIn = 60000 > 30000, still no adjust
      // We need nextRefreshIn < refreshInterval. Set refreshInterval to 600000 (10 min)
      vm = createVm({
        tasklist: [
          {
            name: 'Imminent Task', time: '10:35', ticked: false, passed: false,
          },
        ],
        $apollo: { queries: {} },
      });
      vm.refreshInterval = 600000; // 10 minutes

      vm.checkRoutineItemsForRefresh();

      // 5 min * 60 * 1000 = 300000, which is < 600000, so adjustRefreshInterval is called
      expect(vm.refreshInterval).toBe(300000);
    });
  });

  describe('adjustRefreshInterval', () => {
    it('adjusts interval when new interval is different', () => {
      vm.startIntelligentRefresh({ interval: 30000 });
      const originalTimerId = vm.refreshTimerId;

      vm.adjustRefreshInterval(15000);

      expect(vm.refreshInterval).toBe(15000);
      expect(vm.refreshTimerId).not.toBe(originalTimerId);
    });

    it('enforces minimum interval of 10 seconds', () => {
      vm.startIntelligentRefresh({ interval: 30000 });

      vm.adjustRefreshInterval(5000);

      expect(vm.refreshInterval).toBe(10000);
    });

    it('does nothing when interval has not changed', () => {
      vm.startIntelligentRefresh({ interval: 30000 });
      const timerId = vm.refreshTimerId;

      vm.adjustRefreshInterval(30000);

      // Timer should remain the same
      expect(vm.refreshTimerId).toBe(timerId);
    });
  });

  describe('refreshApolloQueries', () => {
    it('refetches all Apollo queries', () => {
      const refetch1 = jest.fn();
      const refetch2 = jest.fn();
      vm = createVm({
        $apollo: {
          queries: {
            query1: { refetch: refetch1 },
            query2: { refetch: refetch2 },
          },
        },
      });

      vm.refreshApolloQueries();

      expect(refetch1).toHaveBeenCalled();
      expect(refetch2).toHaveBeenCalled();
    });

    it('handles null $apollo gracefully', () => {
      vm = createVm({ $apollo: null });
      expect(() => vm.refreshApolloQueries()).not.toThrow();
    });

    it('handles missing queries object', () => {
      vm = createVm({ $apollo: {} });
      expect(() => vm.refreshApolloQueries()).not.toThrow();
    });

    it('handles query without refetch method', () => {
      vm = createVm({
        $apollo: {
          queries: {
            query1: { /* no refetch */ },
          },
        },
      });
      expect(() => vm.refreshApolloQueries()).not.toThrow();
    });

    it('catches errors during refetch', () => {
      vm = createVm({
        $apollo: {
          queries: {
            query1: {
              refetch: () => { throw new Error('Refetch failed'); },
            },
          },
        },
      });

      expect(() => vm.refreshApolloQueries()).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        'Error refreshing Apollo queries:',
        expect.any(Error),
      );
    });
  });

  describe('getNextRoutineItem', () => {
    it('returns null when tasklist is null', () => {
      vm = createVm({ tasklist: null });
      expect(vm.getNextRoutineItem()).toBeNull();
    });

    it('returns null when tasklist is not an array', () => {
      vm = createVm({ tasklist: 'invalid' });
      expect(vm.getNextRoutineItem()).toBeNull();
    });

    it('returns null when all tasks are ticked', () => {
      vm = createVm({
        tasklist: [{
          name: 'Task', time: '11:00', ticked: true, passed: false,
        }],
      });
      expect(vm.getNextRoutineItem()).toBeNull();
    });

    it('returns null when all tasks are passed', () => {
      vm = createVm({
        tasklist: [{
          name: 'Task', time: '11:00', ticked: false, passed: true,
        }],
      });
      expect(vm.getNextRoutineItem()).toBeNull();
    });

    it('returns upcoming task with isStartingSoon=true', () => {
      // mockNow is 10:30, task at 11:00 is 30 min away → isStartingSoon
      vm = createVm({
        tasklist: [
          {
            name: 'Soon Task', time: '11:00', ticked: false, passed: false,
          },
        ],
      });

      const result = vm.getNextRoutineItem();
      expect(result).not.toBeNull();
      expect(result.name).toBe('Soon Task');
      expect(result.isStartingSoon).toBe(true);
      expect(result.isActive).toBe(false);
      expect(result.minutesToStart).toBe(30);
    });

    it('returns active task with isActive=true', () => {
      // mockNow is 10:30, task at 10:15 is -15 min → isActive
      vm = createVm({
        tasklist: [
          {
            name: 'Active Task', time: '10:15', ticked: false, passed: false,
          },
        ],
      });

      const result = vm.getNextRoutineItem();
      expect(result).not.toBeNull();
      expect(result.name).toBe('Active Task');
      expect(result.isActive).toBe(true);
      expect(result.isStartingSoon).toBe(false);
    });

    it('returns nearest task when multiple are available', () => {
      vm = createVm({
        tasklist: [
          {
            name: 'Far Task', time: '12:00', ticked: false, passed: false,
          },
          {
            name: 'Near Task', time: '10:45', ticked: false, passed: false,
          },
        ],
      });

      const result = vm.getNextRoutineItem();
      expect(result.name).toBe('Near Task');
    });

    it('returns null when tasks are too far in the past (> 30 min ago)', () => {
      // mockNow is 10:30, task at 09:00 is -90 min → beyond -30 window
      vm = createVm({
        tasklist: [
          {
            name: 'Old Task', time: '09:00', ticked: false, passed: false,
          },
        ],
      });
      expect(vm.getNextRoutineItem()).toBeNull();
    });

    it('returns null when no tasks within -30 to future range', () => {
      vm = createVm({
        tasklist: [
          {
            name: 'Very Old', time: '05:00', ticked: false, passed: false,
          },
        ],
      });
      expect(vm.getNextRoutineItem()).toBeNull();
    });
  });

  describe('beforeDestroy', () => {
    it('stops refresh timer', () => {
      vm.startIntelligentRefresh();
      expect(vm.refreshTimerId).not.toBeNull();

      // Call beforeDestroy hook with vm as context
      intelligentRefreshMixin.beforeDestroy.call(vm);

      expect(vm.refreshTimerId).toBeNull();
      expect(vm.isRefreshActive).toBe(false);
    });
  });
});
