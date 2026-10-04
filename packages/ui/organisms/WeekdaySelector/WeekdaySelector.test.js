/* eslint-env jest */
/**
 * WeekdaySelector — day selection plus the long-press that opens the skip sheet.
 *
 * The gesture is the delicate part. A long press and a tap start the same way, so
 * once the press has fired the long-press the click that follows it MUST be
 * swallowed: otherwise the one gesture both opens the skip sheet and changes the
 * selected day, and the sheet is then asking about a day the user did not mean.
 *
 * Only today arms it, because `skipRoutine` takes the day's routine document id
 * and counts the quota up to today — arming yesterday would promise a refusal.
 */
const fs = require('fs');
const path = require('path');
const Vue = require('vue');
const moment = require('moment');

const WeekdaySelector = require('./WeekdaySelector.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const today = moment().format('DD-MM-YYYY');
const otherDay = moment().startOf('week').add(today === moment().startOf('week').format('DD-MM-YYYY') ? 1 : 0, 'days')
  .format('DD-MM-YYYY');

const render = (props = {}) => {
  const vm = new Vue({
    render(h) {
      return h(WeekdaySelector, {
        props: { selectedDate: today, todayDate: today, ...props },
      });
    },
  }).$mount();
  const strip = vm.$children[0];
  const events = { 'date-selected': [], 'long-press': [] };
  Object.keys(events).forEach((name) => {
    strip.$on(name, (payload) => events[name].push(payload));
  });
  return { vm, el: vm.$el, strip, events };
};

const cell = (el, date) => el.querySelector(`[data-testid="weekday-${date}"]`);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('WeekdaySelector — day selection still works', () => {
  it('a plain click selects another day', () => {
    const { el, events } = render();
    const target = cell(el, otherDay);
    target.dispatchEvent(new Event('pointerdown'));
    target.dispatchEvent(new Event('pointerup'));
    target.click();
    expect(events['date-selected']).toEqual([otherDay]);
  });

  it('clicking the already-selected day is a no-op', () => {
    const { el, events } = render();
    cell(el, today).click();
    expect(events['date-selected']).toEqual([]);
  });
});

describe('WeekdaySelector — long press arms at 520ms', () => {
  it('does not fire a moment early', () => {
    const { el, events } = render();
    cell(el, today).dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(519);
    expect(events['long-press']).toEqual([]);
  });

  it('fires at 520ms with today’s date', () => {
    const { el, events } = render();
    cell(el, today).dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(520);
    expect(events['long-press']).toEqual([today]);
  });

  it('honours a custom threshold', () => {
    const { el, events } = render({ longPressMs: 900 });
    cell(el, today).dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(520);
    expect(events['long-press']).toEqual([]);
    jest.advanceTimersByTime(380);
    expect(events['long-press']).toEqual([today]);
  });

  it('a released press never fires', () => {
    const { el, events } = render();
    const target = cell(el, today);
    target.dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(300);
    target.dispatchEvent(new Event('pointerup'));
    jest.advanceTimersByTime(1000);
    expect(events['long-press']).toEqual([]);
  });

  it('a press that slides off the cell never fires', () => {
    const { el, events } = render();
    const target = cell(el, today);
    target.dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(300);
    target.dispatchEvent(new Event('pointerleave'));
    jest.advanceTimersByTime(1000);
    expect(events['long-press']).toEqual([]);
  });

  it('only today arms it', () => {
    const { el, events } = render();
    cell(el, otherDay).dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(1000);
    expect(events['long-press']).toEqual([]);
  });

  it('nothing arms it when the host names no today', () => {
    const { el, events } = render({ todayDate: null });
    cell(el, today).dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(1000);
    expect(events['long-press']).toEqual([]);
  });
});

describe('WeekdaySelector — the long press swallows its click', () => {
  it('a fired long press does not also select the day', () => {
    const { el, events } = render({ selectedDate: otherDay });
    const target = cell(el, today);
    target.dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(520);
    target.dispatchEvent(new Event('pointerup'));
    target.click();
    expect(events['long-press']).toEqual([today]);
    expect(events['date-selected']).toEqual([]);
  });

  it('only the NEXT click is swallowed — the one after it selects', () => {
    const { el, events } = render({ selectedDate: otherDay });
    const target = cell(el, today);
    target.dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(520);
    target.click();
    expect(events['date-selected']).toEqual([]);
    target.click();
    expect(events['date-selected']).toEqual([today]);
  });
});

describe('WeekdaySelector — context menu is the pointer equivalent', () => {
  it('opens the sheet, prevents the browser menu, and swallows the click', () => {
    const { el, strip, events } = render({ selectedDate: otherDay });
    const target = cell(el, today);
    const event = new MouseEvent('contextmenu', { cancelable: true });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(events['long-press']).toEqual([today]);
    expect(strip.suppressClick).toBe(true);
  });

  it('is inert on another day, leaving the browser menu alone', () => {
    const { el, events } = render();
    const event = new MouseEvent('contextmenu', { cancelable: true });
    cell(el, otherDay).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(events['long-press']).toEqual([]);
  });
});

describe('WeekdaySelector — skipped days', () => {
  it('draws a pause overlay on a skipped day only', () => {
    const { el } = render({ skippedDates: [today] });
    expect(el.querySelector(`[data-testid="weekday-skipped-${today}"]`)).toBeTruthy();
    expect(el.querySelector(`[data-testid="weekday-skipped-${otherDay}"]`)).toBeNull();
  });

  it('draws none when nothing is skipped', () => {
    const { el } = render();
    expect(el.querySelectorAll('.day-skipped')).toHaveLength(0);
  });
});

/**
 * The compact (Routine Focus header) form.
 *
 * The design's iPad (6a) and desktop (6b) frames draw the same strip there:
 * seven 38px cells at a 40px pitch, a 28px ring, a 10px label and an 11px
 * number. The full form's 48px ring with 11px/14px type belongs to the legacy
 * dashboard, and the header was rendering that — 50.3px cells, a 36px ring.
 *
 * It keys off `ringSize`, the one prop the host already passes, rather than a
 * second `variant`: a host that names its own ring is the header by definition.
 */
describe('WeekdaySelector — the compact header form', () => {
  const css = fs.readFileSync(path.join(__dirname, 'WeekdaySelector.vue'), 'utf8');
  const declarations = (selector) => {
    const at = css.indexOf(`${selector} {`);
    return at < 0 ? '' : css.slice(at, css.indexOf('}', at));
  };

  it('puts a 28px ring in a 38px cell', () => {
    const { el, strip } = render({ ringSize: 28 });
    expect(strip.ringStyle).toEqual({ width: '28px', height: '28px' });
    // 28 + 10px of surround. The cell must not stretch: the strip sits beside
    // the date, it does not spread across the row.
    expect(strip.cellStyle).toEqual({ flex: '0 0 auto', width: '38px' });
    expect(el.querySelector('.day-column').style.width).toBe('38px');
    expect(el.className).toContain('weekday-selector--compact');
  });

  it('shrinks the label to 10px and the number to 11px', () => {
    expect(declarations('.weekday-selector--compact .day-label'))
      .toContain('font-size: 10px');
    expect(declarations('.weekday-selector--compact .day-number'))
      .toContain('font-size: 11px');
    // 2px between cells gives the design's 40px pitch.
    expect(declarations('.weekday-selector--compact')).toContain('gap: 2px');
  });

  it('leaves the full form alone — the legacy dashboard reads it', () => {
    const { el, strip } = render();
    expect(strip.cellStyle).toEqual({});
    expect(strip.ringStyle).toEqual({});
    expect(el.className).not.toContain('weekday-selector--compact');
    expect(el.querySelector('.day-column').style.width).toBe('');
    // Its own 48px ring with 11px/14px type is untouched.
    expect(declarations('.ring-container')).toContain('width: 48px');
    expect(declarations('.day-label')).toContain('font-size: 11px');
    expect(declarations('.day-number')).toContain('font-size: 14px');
  });

  it('still selects a day and still long-presses in the compact form', () => {
    const { el, events } = render({ ringSize: 28, selectedDate: otherDay });
    const target = cell(el, today);
    target.dispatchEvent(new Event('pointerdown'));
    jest.advanceTimersByTime(520);
    expect(events['long-press']).toEqual([today]);
    target.click();
    expect(events['date-selected']).toEqual([]);
    target.click();
    expect(events['date-selected']).toEqual([today]);
  });
});
