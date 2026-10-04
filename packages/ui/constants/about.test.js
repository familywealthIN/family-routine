/* eslint-env jest */
/**
 * About's content.
 *
 * Two things are worth a test rather than a reading: that the five tabs are the
 * design's trimmed copy (the README's "kept as written" claim is inaccurate —
 * `docs/redesign/chassis.md` § Conflicts), and that the cascade sentence comes
 * from `PROFILE_SETTINGS` so About and Profile cannot say different numbers.
 */
const {
  ABOUT_BELIEF, ABOUT_FEATURES, GETTING_STARTED, spellOut, winsRollUpText,
} = require('./about');

const byKey = (key) => ABOUT_FEATURES.find((feature) => feature.key === key);
const textOf = (feature) => feature.points.map((point) => point.text).join(' ');

describe('the belief', () => {
  it('is one line, and the one the design makes the hero', () => {
    expect(ABOUT_BELIEF)
      .toBe('Incremental daily achievement compounds into outcomes that seemed impossible.');
  });
});

describe('the five feature tabs', () => {
  it('is exactly Routines · Goals · Priority · Agents · Evolution', () => {
    expect(ABOUT_FEATURES.map((feature) => feature.label))
      .toEqual(['Routines', 'Goals', 'Priority', 'Agents', 'Evolution']);
  });

  it('gives every tab an icon and a lead', () => {
    ABOUT_FEATURES.forEach((feature) => {
      expect(feature.icon).toBeTruthy();
      expect(feature.lead).toBeTruthy();
      expect(feature.points.length).toBeGreaterThan(2);
    });
  });

  it('follows the design in trimming the soldier metaphor out of D / K / G', () => {
    const evolution = byKey('evolution');
    const terms = evolution.points.map((point) => point.term);
    expect(terms.slice(0, 3)).toEqual(['Discipline', 'Kinetics', 'Geniuses']);
    // The old long form carried the soldier into each point; the design does not.
    expect(textOf(evolution)).not.toContain('soldier');
    expect(evolution.points[0].text).toBe('be present. Tick routines inside their punctuality window.');
  });

  it('drops the "Picture a soldier" opener but keeps the link to the full analogy', () => {
    const evolution = byKey('evolution');
    expect(evolution.lead).not.toContain('Picture a soldier');
    expect(evolution.lead).toContain('100 each, 300 a day');
    expect(evolution.link)
      .toBe('https://blog.familywealth.in/2022/01/point-system-of-family-routine.html');
    expect(evolution.linkLabel).toBe('Read the full soldier analogy');
  });

  it('drops Priority\'s fifth point, as the design does', () => {
    const priority = byKey('priority');
    expect(priority.points.map((point) => point.term))
      .toEqual(['Do', 'Plan', 'Delegate', 'Automate']);
    expect(textOf(priority)).not.toContain('scorecards');
  });

  it('says Home, not Dashboard', () => {
    const goals = byKey('goals');
    expect(textOf(goals)).toContain('shows on the Home card');
    expect(textOf(goals)).not.toContain('Dashboard');
  });

  it('is the only tab with an external link', () => {
    expect(ABOUT_FEATURES.filter((feature) => feature.link).map((f) => f.key)).toEqual(['evolution']);
  });
});

describe('the cascade sentence', () => {
  it('says six months a year, not the design\'s nine', () => {
    expect(winsRollUpText()).toContain('six months a year');
    expect(winsRollUpText()).not.toContain('nine months');
    expect(textOf(byKey('goals'))).toContain('six months a year');
  });

  it('is built from the threshold it is handed', () => {
    expect(winsRollUpText({ day: 4, week: 2, month: 9 }))
      .toContain('four day wins complete a week, two weeks a month, nine months a year');
  });

  it('spells small numbers and falls back to digits past twelve', () => {
    expect(spellOut(6)).toBe('six');
    expect(spellOut(12)).toBe('twelve');
    expect(spellOut(13)).toBe('13');
  });
});

describe('getting started', () => {
  it('is three numbered steps, each pointing at a real route', () => {
    expect(GETTING_STARTED).toHaveLength(3);
    expect(GETTING_STARTED.map((step) => step.route)).toEqual(['/settings', '/year-goals', '/home']);
  });

  it('names the page you do the thing on', () => {
    expect(GETTING_STARTED.map((step) => step.title)).toEqual([
      'Set honest start times',
      'Write one year goal',
      'Link it to a routine and show up',
    ]);
  });
});
