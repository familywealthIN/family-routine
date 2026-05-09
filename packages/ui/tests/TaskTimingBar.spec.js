const TaskTimingBar = require('../atoms/TaskTimingBar/TaskTimingBar.vue').default;

describe('TaskTimingBar', () => {
    it('has the correct component name', () => {
        expect(TaskTimingBar.name).toBe('AtomTaskTimingBar');
    });

    it('defaults inTimeCount to 0', () => {
        expect(TaskTimingBar.props.inTimeCount.default).toBe(0);
        expect(TaskTimingBar.props.inTimeCount.type).toBe(Number);
    });

    it('defaults outOfTimeCount to 0', () => {
        expect(TaskTimingBar.props.outOfTimeCount.default).toBe(0);
        expect(TaskTimingBar.props.outOfTimeCount.type).toBe(Number);
    });

    it('defaults vertical to false', () => {
        expect(TaskTimingBar.props.vertical.default).toBe(false);
        expect(TaskTimingBar.props.vertical.type).toBe(Boolean);
    });
});
