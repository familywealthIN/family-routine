import type { APIRoute } from 'astro';
import { getPublishedPosts } from '~/lib/blogPosts';
import { AUTHOR, categoryOf, featuredImage } from '~/lib/blog';
import { SITE } from '~/lib/links';

/**
 * The blog's RSS 2.0 feed, built with the site (no @astrojs/rss in the
 * workspace, so it's written by hand). Published posts only, newest first.
 */
const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://routinenotes.app');
  const posts = await getPublishedPosts();
  const feedUrl = new URL('/blog/rss.xml', base).toString();
  const blogUrl = new URL('/blog/', base).toString();
  const newest = posts[0]?.data.publishDate ?? new Date();

  const items = posts
    .map((post) => {
      const url = new URL(`/blog/${post.id}/`, base).toString();
      const image = new URL(featuredImage(post.id), base).toString();
      return `    <item>
      <title>${xml(post.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${post.data.publishDate.toUTCString()}</pubDate>
      <dc:creator>${xml(AUTHOR.name)}</dc:creator>
      <category>${xml(categoryOf(post.data.category).label)}</category>
      <description>${xml(post.data.description)}</description>
      <media:content url="${image}" medium="image" type="image/png" width="1200" height="630" />
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${xml(`${SITE.name} Blog`)}</title>
    <link>${blogUrl}</link>
    <description>${xml('How different people put the KDG evolution framework to work in Routine Notes, and how to chat with it over MCP.')}</description>
    <language>en-gb</language>
    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
