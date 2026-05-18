export const GC_USER_NAME = 'name';
export const GC_USER_EMAIL = 'email';
export const GC_PICTURE = 'picture';
export const GC_AUTH_TOKEN = 'token';
export const GC_NOTIFICATION_TOKEN = 'notification-token';
export const USER_TAGS = 'USER_TAGS';
export const TIMES_UP_TIME = 30;
export const PROACTIVE_START_TIME = 60;
export const ONBOARDING_COMPLETE = 'ONBOARDING_COMPLETE';
export const AI_SEARCH_SETTINGS = 'AI_SEARCH_SETTINGS';

// Profile Settings Constants
export const PROFILE_SETTINGS = {
  startOfWeek: 'sun',
  routineDiscipline: 24, // Maximum time of a routine item in hours
  taskKinetics: 2, // Rate at which task can be performed in hours
  goalGeniuses: 25, // Percent allocation of a period to award points
  autoCheckThreshold: {
    month: 6, // Number of months to be completed to auto check year goal
    week: 3, // Number of weeks to be completed to auto check month goal
    day: 5, // Number of days to be completed to auto check week goal
  },
  defaultTimezone: 'Asia/Kolkata', // IANA zone (India Standard Time)
  // Added user preference for time display (12h or 24h)
  timeFormat: '24h',
};

// Week start options
export const WEEK_START_OPTIONS = [
  { value: 'sun', label: 'Sun' },
  { value: 'mon', label: 'Mon' },
];

// Timezone options (IANA zone names — handle DST automatically)
export const TIMEZONE_OPTIONS = [
  { value: 'Pacific/Kwajalein', label: '(GMT -12:00) Eniwetok, Kwajalein' },
  { value: 'Pacific/Midway', label: '(GMT -11:00) Midway Island, Samoa' },
  { value: 'Pacific/Honolulu', label: '(GMT -10:00) Hawaii' },
  { value: 'Pacific/Marquesas', label: '(GMT -9:30) Taiohae' },
  { value: 'America/Anchorage', label: '(GMT -9:00) Alaska' },
  { value: 'America/Los_Angeles', label: '(GMT -8:00) Pacific Time (US & Canada)' },
  { value: 'America/Denver', label: '(GMT -7:00) Mountain Time (US & Canada)' },
  { value: 'America/Chicago', label: '(GMT -6:00) Central Time (US & Canada), Mexico City' },
  { value: 'America/New_York', label: '(GMT -5:00) Eastern Time (US & Canada), Bogota, Lima' },
  { value: 'America/Caracas', label: '(GMT -4:00) Caracas, La Paz' },
  { value: 'America/Halifax', label: '(GMT -4:00) Atlantic Time (Canada)' },
  { value: 'America/St_Johns', label: '(GMT -3:30) Newfoundland' },
  { value: 'America/Sao_Paulo', label: '(GMT -3:00) Brazil, Buenos Aires, Georgetown' },
  { value: 'Atlantic/South_Georgia', label: '(GMT -2:00) Mid-Atlantic' },
  { value: 'Atlantic/Azores', label: '(GMT -1:00) Azores, Cape Verde Islands' },
  { value: 'Europe/London', label: '(GMT) Western Europe Time, London, Lisbon, Casablanca' },
  { value: 'Europe/Paris', label: '(GMT +1:00) Brussels, Copenhagen, Madrid, Paris' },
  { value: 'Europe/Athens', label: '(GMT +2:00) Kaliningrad, South Africa' },
  { value: 'Europe/Moscow', label: '(GMT +3:00) Baghdad, Riyadh, Moscow, St. Petersburg' },
  { value: 'Asia/Tehran', label: '(GMT +3:30) Tehran' },
  { value: 'Asia/Dubai', label: '(GMT +4:00) Abu Dhabi, Muscat, Baku, Tbilisi' },
  { value: 'Asia/Kabul', label: '(GMT +4:30) Kabul' },
  { value: 'Asia/Karachi', label: '(GMT +5:00) Ekaterinburg, Islamabad, Karachi, Tashkent' },
  { value: 'Asia/Kolkata', label: '(GMT +5:30) Bombay, Calcutta, Madras, New Delhi' },
  { value: 'Asia/Kathmandu', label: '(GMT +5:45) Kathmandu, Pokhara' },
  { value: 'Asia/Dhaka', label: '(GMT +6:00) Almaty, Dhaka, Colombo' },
  { value: 'Asia/Yangon', label: '(GMT +6:30) Yangon, Mandalay' },
  { value: 'Asia/Bangkok', label: '(GMT +7:00) Bangkok, Hanoi, Jakarta' },
  { value: 'Asia/Singapore', label: '(GMT +8:00) Beijing, Perth, Singapore, Hong Kong' },
  { value: 'Australia/Eucla', label: '(GMT +8:45) Eucla' },
  { value: 'Asia/Tokyo', label: '(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk' },
  { value: 'Australia/Adelaide', label: '(GMT +9:30) Adelaide, Darwin' },
  { value: 'Australia/Sydney', label: '(GMT +10:00) Eastern Australia, Guam, Vladivostok' },
  { value: 'Australia/Lord_Howe', label: '(GMT +10:30) Lord Howe Island' },
  { value: 'Pacific/Noumea', label: '(GMT +11:00) Magadan, Solomon Islands, New Caledonia' },
  { value: 'Pacific/Norfolk', label: '(GMT +11:30) Norfolk Island' },
  { value: 'Pacific/Auckland', label: '(GMT +12:00) Auckland, Wellington, Fiji, Kamchatka' },
  { value: 'Pacific/Chatham', label: '(GMT +12:45) Chatham Islands' },
  { value: 'Pacific/Apia', label: '(GMT +13:00) Apia, Nukualofa' },
  { value: 'Pacific/Kiritimati', label: '(GMT +14:00) Line Islands, Tokelau' },
];
