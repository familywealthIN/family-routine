/**
 * "Before you start" — the area/project brief pinned at the top of a routine's
 * chat thread, and the two quick replies that read the same data.
 *
 * Areas and projects are a tag convention, not documents: `area:health:fitness`
 * and `project:dashboard` live in the plain `tags` array on a routine item. So
 * everything here is derived from a tag string plus the `DASHBOARD_CACHE:<tag>`
 * entry `composables/useDashboardCaching` fills in — either on its daily sweep
 * of the AI-Search routines, or on demand the first time the user focuses a
 * routine carrying the tag. Which path filled it makes no difference here.
 *
 * It matters for one thing: a block whose entry has not arrived yet. That is
 * what `pending` is for — see `buildBriefBlocks`.
 *
 * Pure on purpose: the container reads localStorage and owns the Apollo writes,
 * this module only shapes what the organism renders and what the two quick
 * replies say. See `containers/ARCHITECTURE.md`.
 *
 * Tag parsing comes from `@routine-notes/ui/utils/tags` — the one place that
 * splits a `:` tag, shared with the Routines editor and the goal-item page.
 * Note `tagKind` there returns `null` (not `''`) for a tag that is neither an
 * area nor a project, and `breadcrumbSegments` keeps every segment of a tag
 * with no kind rather than dropping the first.
 */
import { tagKind, breadcrumbSegments } from '@routine-notes/ui/utils/tags';

/** Design handoff § "Areas and projects live in chat". */
export const CTX_KIND = {
  area: { kind: 'AREA', icon: 'dashboard', color: '#288bd5' },
  project: { kind: 'PROJECT', icon: 'folder', color: '#E68900' },
};

export const MAX_NEXT_STEPS = 3;
export const MAX_ACTIVITY_ROWS = 3;
// Mirrors apps/server/src/utils/aiApi.js. The server already holds the
// generator to these lengths, but a cache entry can predate that guard by up
// to the 24h TTL and anything here can end up on a checklist verbatim.
const MAX_STEP_WORDS = 7;
const MAX_STEP_CHARS = 60;
const MAX_DESC_WORDS = 24;

const LIST_MARKER = /^(?:[-*>•–—#]+|\(?\d+[.)])\s*/;
// The two strings the server returns when the model is unreachable. Neither is
// a commitment or a task, and the second would land on the checklist.
const FALLBACK = /^unable to generate (?:summary|next steps)/i;

// Re-exported so existing callers keep importing them from here.
export { tagKind, breadcrumbSegments };

/**
 * The breadcrumb as one string. `'›'` inside a block and in chat copy, which is
 * what the design's `briefSub` and reply lines use.
 */
export function breadcrumbLabel(tag, separator = ' › ') {
  return breadcrumbSegments(tag).join(separator);
}

/**
 * One cached line as the card has to show it: no list marker, no markdown
 * emphasis, no wrapping quotes, single-spaced.
 *
 * `keepTerminal` keeps a closing full stop. A step must not have one — the pill
 * has to read as a task — but the description is two clipped clauses and losing
 * its full stop mangles the register.
 */
function stripMarkers(line, { keepTerminal = false } = {}) {
  const trailing = keepTerminal ? /[\s,;:"”]+$/ : /[\s.,;:!"”]+$/;
  return String(line || '')
    .trim()
    .replace(LIST_MARKER, '')
    .replace(/^(?:step\s*\d*|description|summary|commitment|next steps?)\s*:\s*/i, '')
    .replace(/[*`]/g, '')
    .replace(/^["“‘]+/, '')
    .replace(trailing, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const wordCount = (text) => String(text || '').split(' ').filter(Boolean).length;

/**
 * The cached `nextSteps` blob back into the fragments it was built from.
 *
 * The server joins them with a blank line (the Area page renders the string as
 * markdown, which would otherwise collapse single newlines), so splitting on
 * any newline and dropping the blanks recovers the list.
 *
 * @param {string|string[]} nextSteps
 * @returns {string[]} At most three checklist-ready fragments.
 */
export function parseNextSteps(nextSteps) {
  const lines = Array.isArray(nextSteps)
    ? nextSteps.map((entry) => (typeof entry === 'string' ? entry : entry && entry.body))
    : String(nextSteps || '').split(/\r?\n/);

  const seen = {};
  return lines
    .map(stripMarkers)
    .filter((line) => {
      if (!line || !/[a-z0-9]/i.test(line)) return false;
      if (line.endsWith(':') || FALLBACK.test(line)) return false;
      // A sentence cannot be shortened into a fragment safely, and appending
      // one to the checklist is exactly what this guard prevents.
      if (wordCount(line) > MAX_STEP_WORDS || line.length > MAX_STEP_CHARS) return false;
      const key = line.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    })
    .slice(0, MAX_NEXT_STEPS);
}

/**
 * The standing commitment as the card shows it: one line, clipped to the
 * design's word budget, blank when the model had nothing to say.
 */
export function parseDescription(description) {
  const text = stripMarkers(
    String(description || '').split(/\r?\n/)[0] || '',
    { keepTerminal: true },
  );
  if (!text || FALLBACK.test(text)) return '';
  const words = text.split(' ').filter(Boolean);
  if (words.length <= MAX_DESC_WORDS) return text;
  return `${words.slice(0, MAX_DESC_WORDS).join(' ').replace(/[,;:.]+$/, '')}...`;
}

/**
 * One brief block per area/project tag.
 *
 * @param {Array<{ tag: string, description: string, nextSteps: string|string[],
 *   activity: Array<{ date, text, done }>, pending: boolean }>} entries
 *   A tag plus its `DASHBOARD_CACHE:<tag>` payload. The container reads the
 *   cache; this module never touches localStorage. `pending` means that tag's
 *   on-demand context run is still in flight — see below.
 * @param {Object} [options]
 * @param {Function} [options.isAdded] `(text) => boolean` — whether that exact
 *   step is already on today's checklist, so its pill reads "Added".
 * @returns {Array} Blocks for `RoutineBriefCard`, each carrying `pending`. A tag
 *   with nothing cached and nothing on the way is dropped rather than rendered
 *   as an empty block.
 */
export function buildBriefBlocks(entries, { isAdded = () => false } = {}) {
  return (Array.isArray(entries) ? entries : []).reduce((blocks, entry) => {
    if (!entry || !entry.tag) return blocks;
    const kind = tagKind(entry.tag);
    if (!kind) return blocks;

    const steps = parseNextSteps(entry.nextSteps).map((text) => ({
      text,
      added: !!isAdded(text),
    }));
    const activity = (Array.isArray(entry.activity) ? entry.activity : [])
      .filter((row) => row && row.text)
      .slice(0, MAX_ACTIVITY_ROWS)
      .map((row) => ({
        date: String(row.date || ''),
        text: String(row.text),
        done: !!row.done,
      }));
    const description = parseDescription(entry.description);

    // Nothing cached for this tag.
    //
    // If its on-demand run is still in flight, render the half that needs no
    // model call at all: the kind label and the breadcrumb are read straight
    // off the tag string, so they are already true and cannot change when the
    // body lands. The description / NEXT STEPS / PAST ACTIVITY fill in
    // underneath them. The design draws no loading state, and this is the one
    // that belongs — no spinner, no empty card, nothing that moves.
    //
    // The moment the run settles the container clears `pending`, so a tag that
    // resolved to nothing (or failed) loses its block: an empty block is still
    // worse than no block.
    if (!description && !steps.length && !activity.length) {
      if (!entry.pending) return blocks;
      blocks.push({
        tag: entry.tag,
        ...CTX_KIND[kind],
        segments: breadcrumbSegments(entry.tag),
        breadcrumb: breadcrumbLabel(entry.tag),
        description: '',
        steps: [],
        activity: [],
        stat: '',
        pending: true,
      });
      return blocks;
    }

    const doneCount = activity.filter((row) => row.done).length;
    blocks.push({
      tag: entry.tag,
      ...CTX_KIND[kind],
      segments: breadcrumbSegments(entry.tag),
      breadcrumb: breadcrumbLabel(entry.tag),
      description,
      steps,
      activity,
      stat: activity.length ? `${doneCount}/${activity.length} recent` : '',
      pending: false,
    });
    return blocks;
  }, []);
}

/**
 * The collapsed subline: every breadcrumb, then the total step count.
 *
 * A pending block contributes its breadcrumb but no count — while every block
 * is still waiting the number is unknown, and "0 next steps" would be a claim
 * rather than a blank.
 */
export function briefSubline(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const crumbs = list.map((block) => block.breadcrumb).filter(Boolean).join(' · ');
  const settled = list.filter((block) => !block.pending);
  if (list.length && !settled.length) return crumbs;

  const total = settled.reduce((sum, block) => sum + block.steps.length, 0);
  const steps = `${total} next step${total === 1 ? '' : 's'}`;
  return crumbs ? `${crumbs} · ${steps}` : steps;
}

/** Every step across every block that is not on the checklist yet. */
export function unaddedSteps(blocks) {
  return (Array.isArray(blocks) ? blocks : [])
    .reduce((acc, block) => acc.concat(block.steps.filter((step) => !step.added)), [])
    .map((step) => step.text);
}

const RECAP_RE = /what did i do last time|\blast time\b/i;
const PLAN_RE = /plan from next steps|\bplan from\b|\bfrom next steps\b/i;

/**
 * Which brief quick reply a message is, if any. Answered locally from the
 * cached brief instead of going to the model — the data is already on the
 * client and the model would only paraphrase it.
 *
 * @returns {'recap'|'plan'|null}
 */
export function briefQuickReplyIntent(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  if (RECAP_RE.test(value)) return 'recap';
  if (PLAN_RE.test(value)) return 'plan';
  return null;
}

/**
 * "What did I do last time?" — the most recent one or two activity rows plus
 * the first step still unmet.
 *
 * @param {Array} blocks
 * @returns {string}
 */
export function buildRecapReply(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  if (!list.length) return 'No areas or projects on this routine yet.';

  const block = list.find((b) => b.activity.length) || list[0];
  const [first, second] = block.activity;
  const step = (list.find((b) => b.steps.some((s) => !s.added)) || { steps: [] })
    .steps.find((s) => !s.added);
  const stepBlock = step
    ? list.find((b) => b.steps.some((s) => s.text === step.text && !s.added))
    : null;

  const next = step
    ? ` Next up on ${(stepBlock || block).breadcrumb}: “${step.text}”.`
    : '';

  if (!first) return `Nothing logged on ${block.breadcrumb} yet.${next}`;
  const also = second ? ` ${second.date}: ${second.text}.` : '';
  return `Last ${first.date}: ${first.text}.${also}${next}`;
}

/**
 * "Plan from next steps" — the unadded steps as proposals, so the thread's
 * existing "Add all to checklist" button can take them.
 *
 * @returns {{ text: string, proposals: string[] }}
 */
export function buildPlanReply(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const proposals = unaddedSteps(list);
  if (!proposals.length) {
    return { text: 'All next steps are already on the checklist.', proposals: [] };
  }
  const crumbs = list
    .filter((block) => block.steps.some((step) => !step.added))
    .map((block) => block.breadcrumb)
    .filter(Boolean);
  return { text: crumbs.length ? `From ${crumbs.join(' and ')}:` : 'From your next steps:', proposals };
}

export default {
  CTX_KIND,
  tagKind,
  breadcrumbSegments,
  breadcrumbLabel,
  parseNextSteps,
  parseDescription,
  buildBriefBlocks,
  briefSubline,
  unaddedSteps,
  briefQuickReplyIntent,
  buildRecapReply,
  buildPlanReply,
};
