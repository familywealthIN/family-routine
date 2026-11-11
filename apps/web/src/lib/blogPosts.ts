import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished } from './blog';

export type Post = CollectionEntry<'blog'>;

/**
 * Every post whose publishDate has arrived, newest first. The one way pages,
 * the RSS feed and llms.txt read the blog, so a future-dated post stays out of
 * all of them (and, having no page, out of the sitemap) until a build on or
 * after its date.
 */
export async function getPublishedPosts(now = new Date()): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => isPublished(data, now));
  return posts.sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf() || a.data.title.localeCompare(b.data.title),
  );
}
