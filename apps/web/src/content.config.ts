import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORY_IDS, PILLAR_IDS, MCP_TOOLS } from './lib/blog';

/**
 * The blog: one Markdown file per post in src/content/blog. The file name is
 * the slug (/blog/<file name>). Personas are illustrative composites, never
 * real users; the post page says so under every title.
 *
 * Beyond the words, the frontmatter carries the data the post's pictures are
 * drawn from: the persona's routines (featured image timeline and day
 * diagram), the goal cascade, or the MCP tool calls. scripts/blog-images.mjs
 * reads the same fields, and scripts/blog-audit.mjs checks them.
 *
 * A post whose publishDate is still in the future at build time is left out
 * of every page, the sitemap, the RSS feed and llms.txt (see lib/blog.ts).
 */
const pillar = z.enum(PILLAR_IDS);

const routine = z.object({
  time: z.string().regex(/^\d{2}:\d0$/, 'HH:M0, in 10-minute steps'),
  name: z.string().max(24),
  points: z.number().int().min(1).max(50),
  pillar,
  cue: z.string().max(40),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z
    .object({
      title: z.string().max(90),
      description: z.string().max(200),
      category: z.enum(CATEGORY_IDS),
      persona: z.string(),
      pillar,
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      readingTime: z.number().int().positive(),
      tags: z.array(z.string()).max(6),
      takeaways: z.array(z.string().max(170)).min(3).max(4),
      routines: z.array(routine).min(3).max(14).optional(),
      focus: z.string().optional(),
      cascade: z
        .object({
          year: z.string().max(56),
          month: z.string().max(56),
          week: z.string().max(56),
          days: z.array(z.string().max(36)).min(2).max(4),
        })
        .optional(),
      loop: z.boolean().optional(),
      mcp: z
        .object({
          client: z.string().default('Claude'),
          prompt: z.string().max(120),
          tools: z.array(z.enum(MCP_TOOLS)).min(1).max(6),
        })
        .optional(),
      howTo: z
        .object({
          name: z.string(),
          steps: z.array(z.object({ name: z.string(), text: z.string() })).min(3),
        })
        .optional(),
    })
    .superRefine((d, ctx) => {
      if (d.category === 'mcp') {
        if (!d.mcp) ctx.addIssue({ code: 'custom', message: 'MCP posts need mcp: { prompt, tools }' });
        return;
      }
      if (!d.routines || !d.cascade || !d.focus) {
        ctx.addIssue({ code: 'custom', message: 'Persona posts need routines, focus and cascade' });
        return;
      }
      if (!d.routines.some((r) => r.name === d.focus)) {
        ctx.addIssue({ code: 'custom', message: `focus "${d.focus}" is not one of the routines` });
      }
      const total = d.routines.reduce((sum, r) => sum + r.points, 0);
      if (total > 100) ctx.addIssue({ code: 'custom', message: `routines add up to ${total} points, over the 100-point day` });
    }),
});

export const collections = { blog };
