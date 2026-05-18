// Map legacy offset-style timezone values (e.g. "+05:50" which meant +5:30 in
// the pre-IANA custom format) to IANA zone names, so any user documents not
// yet migrated by the web client still resolve to a valid zone.
const LEGACY_OFFSET_TO_IANA = {
  '-12:00': 'Pacific/Kwajalein',
  '-11:00': 'Pacific/Midway',
  '-10:00': 'Pacific/Honolulu',
  '-09:50': 'Pacific/Marquesas',
  '-09:00': 'America/Anchorage',
  '-08:00': 'America/Los_Angeles',
  '-07:00': 'America/Denver',
  '-06:00': 'America/Chicago',
  '-05:00': 'America/New_York',
  '-04:50': 'America/Caracas',
  '-04:00': 'America/Halifax',
  '-03:50': 'America/St_Johns',
  '-03:00': 'America/Sao_Paulo',
  '-02:00': 'Atlantic/South_Georgia',
  '-01:00': 'Atlantic/Azores',
  '+00:00': 'Europe/London',
  '+01:00': 'Europe/Paris',
  '+02:00': 'Europe/Athens',
  '+03:00': 'Europe/Moscow',
  '+03:50': 'Asia/Tehran',
  '+04:00': 'Asia/Dubai',
  '+04:50': 'Asia/Kabul',
  '+05:00': 'Asia/Karachi',
  '+05:50': 'Asia/Kolkata',
  '+05:75': 'Asia/Kathmandu',
  '+06:00': 'Asia/Dhaka',
  '+06:50': 'Asia/Yangon',
  '+07:00': 'Asia/Bangkok',
  '+08:00': 'Asia/Singapore',
  '+08:75': 'Australia/Eucla',
  '+09:00': 'Asia/Tokyo',
  '+09:50': 'Australia/Adelaide',
  '+10:00': 'Australia/Sydney',
  '+10:50': 'Australia/Lord_Howe',
  '+11:00': 'Pacific/Noumea',
  '+11:50': 'Pacific/Norfolk',
  '+12:00': 'Pacific/Auckland',
  '+12:75': 'Pacific/Chatham',
  '+13:00': 'Pacific/Apia',
  '+14:00': 'Pacific/Kiritimati',
};

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

function resolveTimezone(value) {
  if (!value) return DEFAULT_TIMEZONE;
  if (LEGACY_OFFSET_TO_IANA[value]) return LEGACY_OFFSET_TO_IANA[value];
  return value;
}

function getLocalTime(timezone, now = new Date()) {
  return now.toLocaleTimeString('en-GB', {
    timeZone: resolveTimezone(timezone),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Returns DD-MM-YYYY in the given timezone to match the shape stored in the
// routines collection.
function getLocalDate(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: resolveTimezone(timezone),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(now);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${lookup.day}-${lookup.month}-${lookup.year}`;
}

// Group a list of user docs by their effective timezone so each group can be
// handled with a single time/date calculation.
function groupUsersByTimezone(users) {
  const groups = new Map();
  users.forEach((user) => {
    const tz = resolveTimezone(user.timezone);
    if (!groups.has(tz)) groups.set(tz, []);
    groups.get(tz).push(user);
  });
  return groups;
}

module.exports = {
  DEFAULT_TIMEZONE,
  resolveTimezone,
  getLocalTime,
  getLocalDate,
  groupUsersByTimezone,
};
