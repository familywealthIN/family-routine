/**
 * Profile's view model — the parts the design draws as literals.
 *
 * `packages/design/Profile and About.dc.html` hardcodes the point rates
 * ("3 h" / "1 h" / "25%"), the roll-up chain ("9 mos = yr") and a five-entry
 * timezone list with its own label format. All three disagree with shipped data,
 * and `docs/redesign/chassis.md` § "Conflicts between design files — decided"
 * resolves each one: bind the rates to `PROFILE_SETTINGS`, render the real
 * `autoCheckThreshold` (month = **6**, not 9), and use `TIMEZONE_OPTIONS`.
 *
 * So this file holds no numbers of its own. Everything numeric is a function of
 * `PROFILE_SETTINGS` (./settings), which is the same object the server's
 * cascade uses — there is one definition, and the page renders it.
 */
import { PROFILE_SETTINGS } from './settings';

/**
 * D / K / G, in the chassis palette. `setting` names the `PROFILE_SETTINGS` key
 * each card reads, so a rate can never be typed into the markup twice.
 */
export const RATE_META = [
  {
    key: 'D',
    name: 'Discipline',
    setting: 'routineDiscipline',
    unit: 'h',
    desc: 'Longest a routine item can run',
    color: '#4CAF50',
    tint: 'rgba(76,175,80,.1)',
  },
  {
    key: 'K',
    name: 'Kinetics',
    setting: 'taskKinetics',
    unit: 'h',
    desc: 'Rate a task can be done',
    color: '#E53935',
    tint: 'rgba(229,57,53,.08)',
  },
  {
    key: 'G',
    name: 'Geniuses',
    setting: 'goalGeniuses',
    unit: '%',
    desc: 'Share of a period that awards points',
    color: '#2196F3',
    tint: 'rgba(33,150,243,.1)',
  },
];

/**
 * "24 h" / "25%". An absent setting renders an em dash rather than "undefined h"
 * — a read-only figure nobody can correct must not print a lie.
 */
export function formatRate(value, unit) {
  if (value === null || value === undefined || value === '') return '—';
  return unit === '%' ? `${value}%` : `${value} ${unit}`;
}

/** The three tinted cards, each bound to its `PROFILE_SETTINGS` key. */
export function rateCards(settings) {
  const source = settings || PROFILE_SETTINGS;
  return RATE_META.map((meta) => ({
    ...meta,
    value: formatRate(source[meta.setting], meta.unit),
  }));
}

/** Defaults filled in per key, so a partial server payload cannot blank a cell. */
function thresholds(threshold) {
  return { ...PROFILE_SETTINGS.autoCheckThreshold, ...(threshold || {}) };
}

/**
 * The roll-up chain: `1 day → 5 days = wk → 3 wks = mo → 6 mos = yr`.
 *
 * The design's last cell says **9**. Goals, Year Goals and
 * `PROFILE_SETTINGS.autoCheckThreshold.month` all say 6, so 6 is what renders —
 * read from the setting, never typed in.
 */
export function rollUpChain(threshold) {
  const th = thresholds(threshold);
  const cells = [
    { key: 'day', n: '1', unit: 'day' },
    { key: 'week', n: String(th.day), unit: 'days = wk' },
    { key: 'month', n: String(th.week), unit: 'wks = mo' },
    { key: 'year', n: String(th.month), unit: 'mos = yr' },
  ];
  return cells.map((cell, index) => ({ ...cell, hasArrow: index < cells.length - 1 }));
}

/** The sentence under the chain. Same source as the chain, so the two agree. */
export function rollUpSentence(threshold) {
  const th = thresholds(threshold);
  return `${th.day} day wins tick the week goal, ${th.week} weeks tick the month, `
    + `${th.month} months tick the year.`;
}

/** The 12h / 24h switch. 12 is index 0, so its thumb sits left — as drawn. */
export const TIME_FORMATS = [
  { key: '12', label: '12h' },
  { key: '24', label: '24h' },
];

/**
 * `PROFILE_SETTINGS.timeFormat` is `'24h'` while localStorage has held a bare
 * `'24'` since the old page wrote it. Both normalise here so neither spelling
 * can orphan the switch's thumb.
 */
export function normaliseTimeFormat(format) {
  return String(format || '').replace(/h$/i, '') === '12' ? '12' : '24';
}

/** Two real times, so the choice is visible before it is made. */
export function timeFormatPreview(format) {
  return normaliseTimeFormat(format) === '12' ? '9:00 AM · 6:30 PM' : '09:00 · 18:30';
}

/** The toast's consequence line for a format change. */
export function timeFormatConsequence(format) {
  return normaliseTimeFormat(format) === '12' ? '12-hour · 6:30 PM' : '24-hour · 18:30';
}

/** The Always on display switch (DISPLAY card, iPad and tablets). Off sits left. */
export const ALWAYS_ON_OPTIONS = [
  { key: 'off', label: 'Off' },
  { key: 'on', label: 'On' },
];

/** The row's line, the glyph beside the label, and the toast, for each state. */
export function alwaysOnCopy(on) {
  return on
    ? {
      sub: 'This screen stays on while Routine Notes is open',
      icon: 'light_mode',
      iconColor: '#f9a825',
      toast: {
        title: 'Always on display is on', sub: 'This screen won’t sleep while the app is open', icon: 'light_mode', color: '#ffd54f',
      },
    }
    : {
      sub: 'Keep this screen on while Routine Notes is open',
      icon: 'bedtime',
      iconColor: 'rgba(0, 0, 0, .4)',
      toast: {
        title: 'Always on display is off', sub: 'The screen sleeps as usual', icon: 'bedtime', color: '#64b5f6',
      },
    };
}

/** The pre-registered public client (apps/server src/utils/mcpOAuth.js STATIC_CLIENT_ID). */
export const MCP_CLIENT_ID = 'routine-notes-mcp';

/**
 * The setup guides, as the design's numbered steps. Every client finds the
 * sign-in endpoints itself from the Server URL; only n8n's form asks for the
 * Client ID. `serverUrl` is kept as an argument for guides that quote it.
 */
export function platformGuides(serverUrl) {
  const url = serverUrl || 'the Server URL';
  return [
    {
      key: 'Claude',
      label: 'Claude',
      steps: [
        'Open Claude → Settings → Connectors',
        'Click Add custom connector',
        'Name it Routine Notes and paste the Server URL',
        'Click Connect, then Allow on the Routine Notes page',
      ],
    },
    {
      key: 'ChatGPT',
      label: 'ChatGPT',
      steps: [
        'Settings → Apps & Connectors → Advanced → turn on Developer mode',
        'Back in Apps & Connectors, click Create',
        'Name it Routine Notes, paste the Server URL, choose OAuth',
        'Click Create, then Allow on the Routine Notes page',
      ],
    },
    {
      key: 'n8n',
      label: 'n8n',
      steps: [
        'Add an MCP Client Tool node to your agent',
        'Endpoint: the Server URL · Transport: HTTP Streamable',
        'Authentication: MCP OAuth2 → new credential',
        'Client ID as above, then Connect my account',
        'Allow on the Routine Notes page',
      ],
    },
    {
      key: 'Gemini',
      label: 'Gemini',
      steps: [
        `Gemini CLI: run gemini mcp add --transport http routine-notes ${url}`,
        'Start gemini and run /mcp auth routine-notes',
        'Allow on the Routine Notes page',
      ],
    },
    {
      key: 'Perplexity',
      label: 'Perplexity',
      steps: [
        'Settings → Connectors → Add connector → Custom (remote MCP)',
        'Name it Routine Notes and paste the Server URL',
        'Click Connect, then Allow on the Routine Notes page',
      ],
    },
  ];
}

/** The exact word the delete gate wants. Compared after a trim, case-sensitive. */
export const DELETE_CONFIRM_WORD = 'DELETE';

/** True only for an exact match — `delete` and `DELETE ME` both stay disabled. */
export function isDeleteConfirmed(text) {
  return String(text == null ? '' : text).trim() === DELETE_CONFIRM_WORD;
}

export default {
  RATE_META,
  formatRate,
  rateCards,
  rollUpChain,
  rollUpSentence,
  TIME_FORMATS,
  normaliseTimeFormat,
  timeFormatPreview,
  timeFormatConsequence,
  ALWAYS_ON_OPTIONS,
  alwaysOnCopy,
  MCP_CLIENT_ID,
  platformGuides,
  DELETE_CONFIRM_WORD,
  isDeleteConfirmed,
};
