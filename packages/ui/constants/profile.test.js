/* eslint-env jest */
/**
 * Profile's view model — the six places the design disagrees with shipped data.
 *
 * `docs/redesign/chassis.md` § "Conflicts between design files — decided" is the
 * contract these tests enforce. The mock's numbers must not be reachable from
 * here: if someone types "9" or "3 h" back in, one of these fails.
 */
const {
  formatRate,
  rateCards,
  rollUpChain,
  rollUpSentence,
  normaliseTimeFormat,
  timeFormatPreview,
  timeFormatConsequence,
  maskSecret,
  platformGuides,
  isDeleteConfirmed,
  SECRET_PREFIX,
  MCP_CLIENT_ID,
} = require('./profile');

const { PROFILE_SETTINGS } = require('./settings');

describe('point rates — bound to profileSettings, not to the mock', () => {
  it('reads every value out of PROFILE_SETTINGS', () => {
    const cards = rateCards();
    expect(cards.map((card) => card.key)).toEqual(['D', 'K', 'G']);
    expect(cards.map((card) => card.value)).toEqual(['24 h', '2 h', '25%']);
  });

  it('does not render the mock\'s illustrative 3 h / 1 h', () => {
    const values = rateCards().map((card) => card.value);
    expect(values).not.toContain('3 h');
    expect(values).not.toContain('1 h');
  });

  it('follows the settings object it is given, so a server value drops in', () => {
    const cards = rateCards({ routineDiscipline: 12, taskKinetics: 1, goalGeniuses: 40 });
    expect(cards.map((card) => card.value)).toEqual(['12 h', '1 h', '40%']);
  });

  it('carries the chassis D / K / G colours', () => {
    expect(rateCards().map((card) => card.color)).toEqual(['#4CAF50', '#E53935', '#2196F3']);
  });

  it('says so rather than printing "undefined h" for a missing rate', () => {
    expect(formatRate(undefined, 'h')).toBe('—');
    expect(formatRate(null, '%')).toBe('—');
    expect(formatRate(0, 'h')).toBe('0 h');
  });

  it('describes each rate the way the design does', () => {
    expect(rateCards().map((card) => card.desc)).toEqual([
      'Longest a routine item can run',
      'Rate a task can be done',
      'Share of a period that awards points',
    ]);
  });
});

describe('the roll-up chain — 6 months, never the mock\'s 9', () => {
  it('renders 1 day → 5 days → 3 weeks → 6 months', () => {
    expect(rollUpChain().map((cell) => cell.n)).toEqual(['1', '5', '3', '6']);
  });

  it('takes the last cell from autoCheckThreshold.month, which is 6', () => {
    expect(PROFILE_SETTINGS.autoCheckThreshold.month).toBe(6);
    expect(rollUpChain().map((cell) => cell.n)).not.toContain('9');
  });

  it('reads a server-supplied threshold rather than a literal', () => {
    const chain = rollUpChain({ day: 4, week: 2, month: 8 });
    expect(chain.map((cell) => cell.n)).toEqual(['1', '4', '2', '8']);
  });

  it('fills a partial threshold from the shipped defaults', () => {
    expect(rollUpChain({ month: 9 }).map((cell) => cell.n)).toEqual(['1', '5', '3', '9']);
  });

  it('draws an arrow between cells but not after the last one', () => {
    expect(rollUpChain().map((cell) => cell.hasArrow)).toEqual([true, true, true, false]);
  });

  it('writes the sentence from the same source as the chain', () => {
    expect(rollUpSentence()).toBe(
      '5 day wins tick the week goal, 3 weeks tick the month, 6 months tick the year.',
    );
    expect(rollUpSentence()).not.toContain('9 months');
  });
});

describe('time format — two previews, both spellings accepted', () => {
  it('previews two real times per format', () => {
    expect(timeFormatPreview('24')).toBe('09:00 · 18:30');
    expect(timeFormatPreview('12')).toBe('9:00 AM · 6:30 PM');
  });

  it('accepts PROFILE_SETTINGS\' "24h" as well as localStorage\'s "24"', () => {
    expect(normaliseTimeFormat('24h')).toBe('24');
    expect(normaliseTimeFormat('12h')).toBe('12');
    expect(normaliseTimeFormat(PROFILE_SETTINGS.timeFormat)).toBe('24');
  });

  it('falls back to 24-hour for anything it does not recognise', () => {
    expect(normaliseTimeFormat('')).toBe('24');
    expect(normaliseTimeFormat(undefined)).toBe('24');
    expect(normaliseTimeFormat('military')).toBe('24');
  });

  it('gives the toast a consequence, not just a label', () => {
    expect(timeFormatConsequence('24')).toBe('24-hour · 18:30');
    expect(timeFormatConsequence('12')).toBe('12-hour · 6:30 PM');
  });
});

describe('the MCP credentials', () => {
  it('uses the server\'s own secret prefix, not the mock\'s rn_sec_', () => {
    expect(SECRET_PREFIX).toBe('frt_secret_');
    expect(maskSecret('frt_secret_4b9c1e77a03d8f2a')).toBe(`frt_secret_${'•'.repeat(12)}8f2a`);
    expect(maskSecret('frt_secret_4b9c1e77a03d8f2a')).not.toContain('rn_sec_');
  });

  it('shows no tail at all for a secret too short to have one', () => {
    expect(maskSecret('frt_secret_abc')).toBe(`frt_secret_${'•'.repeat(12)}`);
  });

  it('masks nothing when there is nothing to mask', () => {
    expect(maskSecret('')).toBe('');
    expect(maskSecret(null)).toBe('');
  });

  it('is the one client id the server validates', () => {
    expect(MCP_CLIENT_ID).toBe('routine-notes-mcp');
  });

  it('offers the four platform guides as numbered steps', () => {
    const guides = platformGuides('https://mcp.example.com/mcp');
    expect(guides.map((guide) => guide.key)).toEqual(['ChatGPT', 'n8n', 'Gemini', 'Perplexity']);
    guides.forEach((guide) => expect(guide.steps.length).toBeGreaterThan(2));
  });

  it('substitutes the real endpoints into the n8n guide', () => {
    const n8n = platformGuides('https://mcp.example.com/mcp').find((g) => g.key === 'n8n');
    expect(n8n.steps.join(' ')).toContain('https://mcp.example.com/mcp/oauth/authorize');
    expect(n8n.steps.join(' ')).toContain('https://mcp.example.com/mcp/oauth/token');
  });
});

describe('the type-DELETE gate', () => {
  it('arms on an exact match only', () => {
    expect(isDeleteConfirmed('DELETE')).toBe(true);
    expect(isDeleteConfirmed('  DELETE  ')).toBe(true);
  });

  it('stays shut for anything else at all', () => {
    ['', 'delete', 'Delete', 'DELET', 'DELETEE', 'DELETE me', 'DEL ETE', null, undefined]
      .forEach((value) => expect(isDeleteConfirmed(value)).toBe(false));
  });
});
