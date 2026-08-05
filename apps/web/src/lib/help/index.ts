/**
 * The Routine Notes help centre.
 *
 * Structure mirrors the URLs:
 *   /help                            -> the hub
 *   /help/categories/<category>      -> a category and its subcategory sections
 *   /help/articles/<slug>            -> one article
 */
import { categories } from './categories';
import { getStartedArticles } from './articles/get-started';
import { routineArticles } from './articles/routines';
import { goalArticles } from './articles/goals';
import { priorityArticles } from './articles/priority';
import { pointArticles } from './articles/points';
import { agentArticles } from './articles/agents';
import { aiArticles } from './articles/ai';
import { groupArticles } from './articles/groups';
import { progressArticles } from './articles/progress';
import { accountArticles } from './articles/account';
import { troubleshootingArticles } from './articles/troubleshooting';
import type { Block, HelpArticle, HelpCategory, HelpSubcategory } from './types';

export * from './types';
export { categories };

export const articles: HelpArticle[] = [
  ...getStartedArticles,
  ...routineArticles,
  ...goalArticles,
  ...priorityArticles,
  ...pointArticles,
  ...agentArticles,
  ...aiArticles,
  ...groupArticles,
  ...progressArticles,
  ...accountArticles,
  ...troubleshootingArticles,
];

const bySlug = new Map(articles.map((a) => [a.slug, a]));
const byCategory = new Map<string, HelpCategory>(categories.map((c) => [c.id, c]));

export function getArticle(slug: string): HelpArticle | undefined {
  return bySlug.get(slug);
}

export function getCategory(id: string): HelpCategory | undefined {
  return byCategory.get(id);
}

export function articlesInCategory(categoryId: string): HelpArticle[] {
  return articles.filter((a) => a.category === categoryId);
}

export function articlesInSubcategory(categoryId: string, subcategoryId: string): HelpArticle[] {
  return articles.filter((a) => a.category === categoryId && a.subcategory === subcategoryId);
}

export function popularArticles(): HelpArticle[] {
  return articles.filter((a) => a.popular);
}

/** Subcategories that actually contain at least one article. */
export function populatedSubcategories(category: HelpCategory): HelpSubcategory[] {
  return category.subcategories.filter(
    (s) => articlesInSubcategory(category.id, s.id).length > 0,
  );
}

export function breadcrumbFor(article: HelpArticle) {
  const category = byCategory.get(article.category);
  const subcategory = category?.subcategories.find((s) => s.id === article.subcategory);
  return { category, subcategory };
}

export function relatedArticles(article: HelpArticle): HelpArticle[] {
  return (article.related ?? [])
    .map((slug) => bySlug.get(slug))
    .filter((a): a is HelpArticle => Boolean(a) && a!.slug !== article.slug);
}

/** Plain text of a block, used to build the search index. */
function blockText(block: Block): string {
  switch (block.kind) {
    case 'p':
      return block.text;
    case 'list':
    case 'steps':
      return block.items.join(' ');
    case 'platformSteps':
      return block.groups.flatMap((g) => g.steps).join(' ');
    case 'callout':
      return [block.title, block.text].filter(Boolean).join(' ');
    case 'table':
      return [...block.head, ...block.rows.flat()].join(' ');
    case 'terms':
      return block.items.map((i) => `${i.term} ${i.def}`).join(' ');
  }
}

/** Strip the inline markdown we support, so search matches on words not syntax. */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*`_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchEntry {
  slug: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  /** Lowercased haystack of everything searchable in the article. */
  text: string;
}

/**
 * Built at build time and serialised into the page, so search runs entirely
 * client-side with no network round trip.
 */
export function searchIndex(): SearchEntry[] {
  return articles.map((article) => {
    const body = article.sections
      .map((s) => `${s.heading} ${s.blocks.map(blockText).join(' ')}`)
      .join(' ');
    return {
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      category: article.category,
      categoryLabel: byCategory.get(article.category)?.label ?? '',
      text: plain(
        [article.title, article.summary, article.intro, body, (article.keywords ?? []).join(' ')].join(' '),
      ).toLowerCase(),
    };
  });
}
