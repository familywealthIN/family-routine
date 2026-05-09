const {
    getEstimatedStimulusUnit,
    updateStimulusEarnedPoint,
    removeStimulusEarnedPoint,
} = require('../src/utils/stimulusPoints');

function makeTask(points, stimuli) {
    return {
        points,
        stimuli: stimuli.map((s) => ({ ...s })),
    };
}

describe('stimulusPoints', () => {
    describe('getEstimatedStimulusUnit', () => {
        it('returns points for D action when earned < points', () => {
            const task = makeTask(10, [{ name: 'D', earned: 0, splitRate: 1 }]);
            const result = getEstimatedStimulusUnit('D', task);
            expect(result.earned).toBe(10);
        });

        it('returns 0 for D action when already earned enough', () => {
            const task = makeTask(10, [{ name: 'D', earned: 10, splitRate: 1 }]);
            const result = getEstimatedStimulusUnit('D', task);
            expect(result.earned).toBe(0);
        });

        it('calculates K action earned based on split rate', () => {
            const task = makeTask(10, [
                { name: 'D', earned: 0, splitRate: 1 },
                { name: 'K', earned: 0, splitRate: 0.5 },
            ]);
            const result = getEstimatedStimulusUnit('K', task);
            expect(result.earned).toBe(5); // 10 / 2
            expect(result.count).toBe(2);
        });

        it('calculates G action for day period', () => {
            const task = makeTask(10, [{ name: 'G', earned: 0, splitRate: 1 }]);
            const result = getEstimatedStimulusUnit('G', task, false, 'day');
            expect(result.earned).toBe(2.5); // 10 * 0.25
        });

        it('calculates G action for week period', () => {
            const task = makeTask(10, [{ name: 'G', earned: 0, splitRate: 1 }]);
            const result = getEstimatedStimulusUnit('G', task, false, 'week');
            expect(result.earned).toBe(5); // 10 * 0.50
        });

        it('calculates G action for month period', () => {
            const task = makeTask(10, [{ name: 'G', earned: 0, splitRate: 1 }]);
            const result = getEstimatedStimulusUnit('G', task, false, 'month');
            expect(result.earned).toBe(7.5); // 10 * 0.75
        });

        it('calculates G action for year period', () => {
            const task = makeTask(10, [{ name: 'G', earned: 0, splitRate: 1 }]);
            const result = getEstimatedStimulusUnit('G', task, false, 'year');
            expect(result.earned).toBe(10); // 10 * 1
        });

        it('returns 0 for unknown action', () => {
            const task = makeTask(10, [{ name: 'X', earned: 0, splitRate: 1 }]);
            const result = getEstimatedStimulusUnit('X', task);
            expect(result.earned).toBe(0);
        });
    });

    describe('updateStimulusEarnedPoint', () => {
        it('adds earned to D stimulus', () => {
            const task = makeTask(10, [{ name: 'D', earned: 0, splitRate: 1 }]);
            const result = updateStimulusEarnedPoint('D', task);
            const d = result.find((s) => s.name === 'D');
            expect(d.earned).toBe(10);
        });

        it('sets G stimulus earned directly (not additive)', () => {
            const task = makeTask(10, [{ name: 'G', earned: 0, splitRate: 1 }]);
            const result = updateStimulusEarnedPoint('G', task, 'day');
            const g = result.find((s) => s.name === 'G');
            expect(g.earned).toBe(2.5);
        });
    });

    describe('removeStimulusEarnedPoint', () => {
        it('does not subtract when earned equals points (no over-earn)', () => {
            const task = makeTask(10, [{ name: 'D', earned: 10, splitRate: 1 }]);
            const result = removeStimulusEarnedPoint('D', task);
            const d = result.find((s) => s.name === 'D');
            // D returns earned=0 from getEstimatedStimulusUnit when earned >= points
            expect(d.earned).toBe(10);
        });

        it('subtracts K earned correctly', () => {
            const task = makeTask(10, [
                { name: 'D', earned: 0, splitRate: 1 },
                { name: 'K', earned: 5, splitRate: 0.5 },
            ]);
            const result = removeStimulusEarnedPoint('K', task);
            const k = result.find((s) => s.name === 'K');
            expect(k.earned).toBe(0); // earned >= points/count so subtracts 5
        });
    });
});
