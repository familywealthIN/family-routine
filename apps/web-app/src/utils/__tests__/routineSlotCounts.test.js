/* eslint-env jest */
/**
 * D-03: changing Wind-down's time from 11:30 to 21:30 moved Start Work's card
 * header from "09:00 - 0/1" to "09:00 - 0/6" with nothing on screen saying so.
 * The target is the gap to the next item at one task per two hours, so the
 * Settings form has to name the items an edit retargets.
 */
import { slotCountsByItem, describeSlotChanges } from '../routineSlotCounts';

// The beta-run routine: one day goal item under Start Work, Wind-down last.
const before = [
  { id: 'start-work', name: 'Start Work', time: '09:00' },
  { id: 'wind-down', name: 'Wind-down', time: '11:30' },
];

const after = [
  { id: 'start-work', name: 'Start Work', time: '09:00' },
  { id: 'wind-down', name: 'Evening Wind-down', time: '21:30' },
];

describe('slotCountsByItem', () => {
  it('matches the card: one slot for the 2h30m Start Work window', () => {
    expect(slotCountsByItem(before)).toEqual({ 'start-work': 1, 'wind-down': 6 });
  });

  it('runs the last item of the day to midnight, as the server does', () => {
    expect(slotCountsByItem(after)).toEqual({ 'start-work': 6, 'wind-down': 1 });
  });

  it('floors a short gap at two hours so every item keeps one slot', () => {
    expect(slotCountsByItem([
      { id: 'stretch', name: 'Stretch', time: '07:00' },
      { id: 'shower', name: 'Shower', time: '07:30' },
      { id: 'sleep', name: 'Sleep', time: '23:00' },
    ])).toEqual({ stretch: 1, shower: 8, sleep: 1 });
  });

  it('reads the schedule in time order, not list order', () => {
    expect(slotCountsByItem([before[1], before[0]]))
      .toEqual(slotCountsByItem(before));
  });
});

describe('describeSlotChanges', () => {
  it('names the other item the edit retargeted, in schedule order', () => {
    expect(describeSlotChanges(before, after))
      .toEqual(['Start Work: 1 -> 6', 'Evening Wind-down: 6 -> 1']);
  });

  it('says nothing when the edit leaves every target where it was', () => {
    const renamed = [
      { ...before[0], name: 'Deep Work' },
      before[1],
    ];

    expect(describeSlotChanges(before, renamed)).toEqual([]);
  });

  it('skips an item that has no before/after pair', () => {
    const added = [...before, { id: 'lunch', name: 'Lunch', time: '13:00' }];

    expect(describeSlotChanges(before, added)).toEqual(['Wind-down: 6 -> 1']);
  });
});
