const sortTimes = require('../src/utils/sortTimes');

describe('sortTimes', () => {
    it('sorts items by hour ascending', () => {
        const items = [
            { time: '14:00', name: 'C' },
            { time: '08:00', name: 'A' },
            { time: '10:00', name: 'B' },
        ];
        const sorted = sortTimes(items);
        expect(sorted.map((i) => i.name)).toEqual(['A', 'B', 'C']);
    });

    it('sorts items by minutes when hours are equal', () => {
        const items = [
            { time: '09:30', name: 'B' },
            { time: '09:10', name: 'A' },
            { time: '09:45', name: 'C' },
        ];
        const sorted = sortTimes(items);
        expect(sorted.map((i) => i.name)).toEqual(['A', 'B', 'C']);
    });

    it('handles an empty array', () => {
        expect(sortTimes([])).toEqual([]);
    });

    it('handles a single element', () => {
        const items = [{ time: '12:00', name: 'only' }];
        expect(sortTimes(items)).toEqual([{ time: '12:00', name: 'only' }]);
    });

    it('handles midnight and late times', () => {
        const items = [
            { time: '23:59', name: 'late' },
            { time: '00:01', name: 'midnight' },
            { time: '12:00', name: 'noon' },
        ];
        const sorted = sortTimes(items);
        expect(sorted.map((i) => i.name)).toEqual(['midnight', 'noon', 'late']);
    });
});
