/**
 * Content model for the Routine Notes help centre.
 *
 * Articles are data, not markdown, so that every page gets the same anatomy:
 * breadcrumb -> jump-link table of contents -> sections -> related articles.
 * Section ids double as the anchor targets used by the in-page contents rail.
 */

export type Platform = 'web' | 'ios' | 'android';

export const PLATFORM_LABELS: Record<Platform, string> = {
  web: 'Web & desktop',
  ios: 'iOS & iPadOS',
  android: 'Android',
};

export type CalloutTone = 'tip' | 'note' | 'warning';

export type Block =
  /** A paragraph. Inline `code`, **bold** and [links](/help) are supported. */
  | { kind: 'p'; text: string }
  /** An unordered list of short points. */
  | { kind: 'list'; items: string[] }
  /** A numbered procedure. Keep each step to a single action. */
  | { kind: 'steps'; items: string[] }
  /** A numbered procedure that differs per platform, shown behind tabs. */
  | { kind: 'platformSteps'; groups: { platform: Platform; steps: string[] }[] }
  /** A tip / note / warning box. */
  | { kind: 'callout'; tone: CalloutTone; title?: string; text: string }
  /** A reference table. `head.length` must match every row's length. */
  | { kind: 'table'; head: string[]; rows: string[][] }
  /** A term/definition list — used by the glossary and by status references. */
  | { kind: 'terms'; items: { term: string; def: string }[] };

export interface HelpSection {
  /** Anchor id. Must be unique within the article and URL-safe. */
  id: string;
  heading: string;
  blocks: Block[];
}

export interface HelpArticle {
  slug: string;
  title: string;
  /** One sentence, shown in listings, search results and the meta description. */
  summary: string;
  /** Category id, must exist in `categories`. */
  category: string;
  /** Subcategory id, must exist on the parent category. */
  subcategory: string;
  /** ISO date, surfaced as "Last updated". */
  updated: string;
  /** Extra search terms that do not appear in the prose. */
  keywords?: string[];
  /** Surfaced on the help home page under "Popular articles". */
  popular?: boolean;
  /** Lead paragraph, rendered above the table of contents. */
  intro: string;
  sections: HelpSection[];
  /** Slugs of articles to show in the "Related articles" rail. */
  related?: string[];
}

export interface HelpSubcategory {
  id: string;
  label: string;
  /** Optional one-liner shown above the article list. */
  blurb?: string;
}

export interface HelpCategory {
  id: string;
  label: string;
  /** Phosphor icon name, e.g. `ph:house-simple`. */
  icon: string;
  accent: string;
  blurb: string;
  subcategories: HelpSubcategory[];
}
