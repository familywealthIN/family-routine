/**
 * Blog taxonomy and pure helpers, shared by the content schema
 * (src/content.config.ts), the /blog pages, the diagrams and the RSS/llms.txt
 * endpoints. No `astro:content` import here: the content config imports this
 * file, so collection reads live in lib/blogPosts.ts.
 *
 * Pillar colours are the ones the KDG framework section uses on the home page.
 */
export const CATEGORIES = [
  { id: 'work', label: 'Work & career', icon: 'ph:briefcase' },
  { id: 'body', label: 'Body & sport', icon: 'ph:person-simple-run' },
  { id: 'mind', label: 'Mind & learning', icon: 'ph:brain' },
  { id: 'home', label: 'Home & family', icon: 'ph:house-line' },
  { id: 'life', label: 'Life stages', icon: 'ph:path' },
  { id: 'playbook', label: 'Playbooks', icon: 'ph:book-open-text' },
  { id: 'mcp', label: 'Chat with MCP', icon: 'ph:chats-circle' },
] as const;

export const PILLARS = [
  { id: 'D', name: 'Discipline', short: 'Show up on time', color: '#5aa3d3' },
  { id: 'K', name: 'Kinetics', short: 'Act with full dedication', color: '#288bd5' },
  { id: 'G', name: 'Geniuses', short: 'Improve the plan', color: '#1a5a8f' },
] as const;

/** The tools the Routine Notes MCP server lists (apps/server/src/mcp-http-server.js). */
export const MCP_TOOLS = [
  'get_current_date',
  'get_routine',
  'get_daily_goals',
  'search_goals',
  'add_goal_item',
  'complete_goal_item',
  'bulk_add_goal_items',
  'generate_milestone_plan',
  'extract_day_task',
  'get_progress',
  'get_priority_goals',
  'reschedule_goal_item',
  'graphql_query',
] as const;

export const MCP_URL = 'https://mcp.routinenotes.app/mcp';

/** The thresholds a period goal auto-ticks at (packages/ui/utils/getDates.js `threshold`). */
export const THRESHOLD = { weekDays: 5, monthWeeks: 3, yearMonths: 6 } as const;

/** The punctuality window around a routine's start time, in minutes. */
export const WINDOW = { before: 60, after: 30 } as const;

/** The byline on every post: the founder, whose /about page introduces him. */
export const AUTHOR = {
  name: 'Gaurav Panchal',
  role: 'founder',
  jobTitle: 'Founder, Routine Notes',
  url: '/about',
  image: 'https://avatars.githubusercontent.com/grvpanchal',
  sameAs: ['https://github.com/grvpanchal'],
} as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type PillarId = (typeof PILLARS)[number]['id'];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];
export const PILLAR_IDS = PILLARS.map((p) => p.id) as [PillarId, ...PillarId[]];

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
export const pillarOf = (id: string) => PILLARS.find((p) => p.id === id) ?? PILLARS[0];

export interface Routine {
  time: string;
  name: string;
  points: number;
  pillar: PillarId;
  cue: string;
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMinutes = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export const windowFor = (time: string) => ({
  open: fromMinutes(toMinutes(time) - WINDOW.before),
  close: fromMinutes(toMinutes(time) + WINDOW.after),
});

/** A post is live once its publish date has arrived (checked at build time). */
export const isPublished = (data: { publishDate: Date }, now = new Date()) => data.publishDate.valueOf() <= now.valueOf();

/** The featured image scripts/blog-images.mjs writes for a post. */
export const featuredImage = (slug: string) => `/blog/${slug}.png`;
export const FEATURED = { width: 1200, height: 630 } as const;

/** Alt text for the featured image, written from the same data the image is drawn from. */
export function featuredAlt(data: {
  title: string;
  persona: string;
  category: string;
  routines?: Routine[];
  mcp?: { client?: string; tools: readonly string[] };
}) {
  if (data.category === 'mcp' && data.mcp) {
    return `${data.title}. A flow from ${data.mcp.client || 'Claude'} through the Routine Notes connector, calling ${data.mcp.tools.join(', ')}.`;
  }
  const r = data.routines ?? [];
  const day = r.map((x) => `${x.time} ${x.name} (${pillarOf(x.pillar).name})`).join(', ');
  return `${data.title}. The ${data.persona.toLowerCase()}'s day on a timeline, coloured by pillar: ${day}.`;
}

/** Up to `n` other posts: same category first, then shared tags, then the same pillar. */
export function relatedPosts<T extends { id: string; data: { category: string; pillar: string; tags: string[]; title: string } }>(
  post: T,
  all: T[],
  n = 3,
): T[] {
  const score = (other: T) =>
    (other.data.category === post.data.category ? 3 : 0) +
    other.data.tags.filter((t) => post.data.tags.includes(t)).length * 2 +
    (other.data.pillar === post.data.pillar ? 1 : 0);
  return all
    .filter((other) => other.id !== post.id)
    .map((other) => ({ other, s: score(other) }))
    .sort((a, b) => b.s - a.s || a.other.id.localeCompare(b.other.id))
    .slice(0, n)
    .map(({ other }) => other);
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Greedy word wrap by character count, for SVG text that has no layout engine. */
export function wrap(text: string, maxChars: number, maxLines = 3): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s,.;:]+$/, '')}…`;
    return kept;
  }
  return lines;
}
