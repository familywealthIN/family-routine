export const APP_URL = 'https://routine.familywealth.in';
export const APP_LOGIN_URL = APP_URL + '/';

export const SITE = {
  name: 'Routine Notes',
  domain: 'routinenotes.ai',
  tagline: 'The evolution App for ambitious people.',
  description:
    'Routine Notes turns your daily actions into Kinetics, Discipline, and Geniuses points — your personal evolution score. Free as long as you keep moving.',
} as const;

export const LINKS = {
  appLogin: APP_LOGIN_URL,
  appStarted: APP_LOGIN_URL,
  guide: '/guide',
  pricing: '/pricing',
  about: '/about',
  privacy: 'https://familywealth.in/privacy-policy',
  terms: 'https://familywealth.in/terms',
  support: 'mailto:support@familywealth.in',
  github: 'https://github.com/familywealthIN',
  linkedin: 'https://www.linkedin.com/in/grvpanchal',
} as const;

export const NAV = [
  { label: 'Guide', href: LINKS.guide },
  { label: 'Pricing', href: LINKS.pricing },
  { label: 'About', href: LINKS.about },
] as const;
