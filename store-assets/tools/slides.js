// One entry per store slide, in listing order. `route` is the in-app path to
// capture, `caption` is the marketing line rendered above the device.
// Routes verified against apps/web-app/src/router.js. /agenda/tree was dropped:
// it renders as a nearly empty timeline and reads as a broken screen.
// /year-goals needs the :id of a year goal item - the bare route always shows
// the empty state, because the tree query is skipped without one.
module.exports = [
  { key: '01-dashboard', route: '/home', caption: 'Build the routine<br>your goals need' },
  { key: '02-progress', route: '/progress/week', caption: 'See the week you<br>actually lived' },
  { key: '03-goals', route: '/goals', caption: 'Ladder days into<br>weeks and months' },
  { key: '05-priority', route: '/priority', caption: 'Know what matters<br>before you start' },
  { key: '06-year-goals', route: '/year-goals/6a49e8942a00bb51ece91d3d', caption: 'Build and refine<br>your year goals' },
  { key: '07-routine', route: '/settings', caption: 'Design the day once,<br>run it every day' },
];
