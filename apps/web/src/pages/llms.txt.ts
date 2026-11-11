import type { APIRoute } from 'astro';
import { getPublishedPosts } from '~/lib/blogPosts';
import { CATEGORIES } from '~/lib/blog';
import { chapters } from '~/lib/guide';
import { SITE } from '~/lib/links';

/**
 * /llms.txt (llmstxt.org): a plain map of the site for language models: what
 * Routine Notes is, the guide chapters and every published blog post with a
 * one-line summary, grouped by category.
 */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://routinenotes.app');
  const abs = (path: string) => new URL(path, base).toString();
  const posts = await getPublishedPosts();

  const lines: string[] = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.name} is a routine app built on the KDG evolution framework: Discipline (D) for ticking a routine inside its punctuality window, which opens 60 minutes before the start time and closes 30 minutes after; Kinetics (K) for working the routine's steps and quick tasks; Geniuses (G) for ticking items linked into a year → month → week → day goal cascade. Each pillar earns up to 100 points a day. A missed routine can be checked in late the same day by spending points, which keeps the streak and still runs its agents. A week goal auto-completes at 5 met days, a month at 3 met weeks and a year at 6 met months. It runs on the web, iOS and Android, and connects to AI apps over MCP at https://mcp.routinenotes.app/mcp.`,
    '',
    'Blog personas are illustrative composites, not real users.',
    '',
    '## Product',
    '',
    `- [Why Routine Notes](${abs('/why/')}): to-dos, notes and AI agents in one app built around your daily routine`,
    `- [Pricing](${abs('/pricing/')}): free while your earned points cover your missed check-ins`,
    `- [About](${abs('/about/')}): why the app measures daily evolution with points`,
    '',
    '## Guide',
    '',
    `- [The field guide](${abs('/guide/')}): one concept, four surfaces`,
    ...chapters.map((c) => `- [${c.label}](${abs(`/guide/${c.id}/`)}): ${c.lead}`),
  ];

  for (const cat of CATEGORIES) {
    const inCat = posts.filter((p) => p.data.category === cat.id);
    if (!inCat.length) continue;
    lines.push('', `## Blog: ${cat.label}`, '');
    for (const p of inCat) lines.push(`- [${p.data.title}](${abs(`/blog/${p.id}/`)}): ${p.data.description}`);
  }
  lines.push('', '## Optional', '', `- [Blog RSS feed](${abs('/blog/rss.xml')})`, `- [Sitemap](${abs('/sitemap-index.xml')})`, '');

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
