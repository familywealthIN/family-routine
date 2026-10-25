/* eslint-env jest */
/**
 * `$notify` draws the same AppToast the redesigned pages use, so every toast in
 * the app looks the same. The call sites keep their vue-notification shape.
 */
const Vue = require('vue');

const {
  toToast, notify, clearToast, toastState, TOAST_LOOK, MIN_DURATION,
} = require('../notifications');

describe('$notify', () => {
  beforeEach(() => clearToast());

  it('is installed on every component', () => {
    expect(new Vue().$notify).toBe(notify);
  });

  it('maps title + text onto the toast title + sub, with the type\'s icon and colour', () => {
    expect(toToast({
      group: 'notify', type: 'error', title: 'Save failed', text: 'Try again', duration: 5000,
    })).toEqual({
      title: 'Save failed', sub: 'Try again', ...TOAST_LOOK.error, duration: 5000,
    });
  });

  it('leads with the text when there is no title, so nothing is dropped', () => {
    expect(toToast({ type: 'info', text: 'Synced' })).toMatchObject({ title: 'Synced', sub: '' });
    expect(toToast('Copied')).toMatchObject({ title: 'Copied', sub: '' });
  });

  it('falls back to the success look and never runs shorter than the card animation', () => {
    expect(toToast({ title: 'Done', type: 'mystery', duration: 1000 }))
      .toMatchObject({ ...TOAST_LOOK.success, duration: MIN_DURATION });
  });

  it('bumps seq on every call so a repeated message replays', () => {
    notify({ title: 'Saved' });
    const first = toastState.seq;
    notify({ title: 'Saved' });
    expect(toastState).toMatchObject({ title: 'Saved', seq: first + 1 });
  });

  it('ignores an empty call and clears on done', () => {
    notify({});
    expect(toastState.title).toBe('');
    notify({ title: 'Saved', text: 'All good' });
    clearToast();
    expect(toastState).toMatchObject({ title: '', sub: '' });
  });
});
