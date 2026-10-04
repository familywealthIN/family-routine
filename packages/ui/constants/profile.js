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

/** The one OAuth client id the server validates (`OAUTH_CLIENT_ID`'s default). */
export const MCP_CLIENT_ID = 'routine-notes-mcp';

/** The server's own prefix (`mcp-http-server.js`), not the mock's `rn_sec_`. */
export const SECRET_PREFIX = 'frt_secret_';

/**
 * `frt_secret_••••••••••••a1b2` — enough to tell two secrets apart, not enough
 * to use one. Anything too short to have a tail is masked whole.
 */
export function maskSecret(secret) {
  const value = String(secret || '');
  if (!value) return '';
  const cut = value.lastIndexOf('_') + 1;
  const head = value.slice(0, cut);
  const tail = value.length - cut >= 8 ? value.slice(-4) : '';
  return `${head}${'•'.repeat(12)}${tail}`;
}

/**
 * The four setup guides, as the design's numbered steps rather than the old
 * page's nested prerequisite lists. `serverUrl` is substituted in so the n8n
 * endpoints are the real ones rather than an ellipsis.
 */
export function platformGuides(serverUrl) {
  const base = serverUrl || '';
  return [
    {
      key: 'ChatGPT',
      label: 'ChatGPT',
      steps: [
        'Open ChatGPT → profile → Settings → Beta features',
        'Find MCP Servers and click Add MCP Server',
        'Paste the Server URL, Client ID and Client Secret',
        'Click Authorize, then Authorize again here',
      ],
    },
    {
      key: 'n8n',
      label: 'n8n',
      steps: [
        'Credentials → New credential → OAuth2 API',
        'Grant type: Authorization Code',
        `Auth URL ${base}/oauth/authorize · Token URL ${base}/oauth/token`,
        'Client ID, Client Secret, scope “read write”',
        'Connect my account, then use an HTTP Request node',
      ],
    },
    {
      key: 'Gemini',
      label: 'Gemini',
      steps: [
        'Open Gemini → Settings → Extensions',
        'Add Extension → Custom OAuth App / MCP Server',
        'Paste the Server URL, Client ID and Client Secret',
        'Click Connect',
      ],
    },
    {
      key: 'Perplexity',
      label: 'Perplexity',
      steps: [
        'Settings → Integrations → Add Integration',
        'Choose OAuth 2.0, name it Routine Notes',
        'Paste the Server URL, Client ID and Client Secret',
        'Click Connect',
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
  MCP_CLIENT_ID,
  SECRET_PREFIX,
  maskSecret,
  platformGuides,
  DELETE_CONFIRM_WORD,
  isDeleteConfirmed,
};
