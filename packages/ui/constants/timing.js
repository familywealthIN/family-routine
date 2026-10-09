/**
 * How a routine check-in landed against its window — the drawer's day ribbon
 * and the Progress page's Timing card draw these four the same way.
 */
export const TIMING_ORDER = ['onTime', 'late', 'missed', 'pending'];

export const TIMING = {
  onTime: { label: 'on time', color: '#4CAF50' },
  late: { label: 'late', color: '#FF9800' },
  missed: { label: 'missed', color: '#e57373' },
  pending: { label: 'to come', color: 'rgba(0,0,0,.1)' },
};

export default { TIMING_ORDER, TIMING };
