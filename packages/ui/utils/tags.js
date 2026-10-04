/**
 * Hierarchical `:` tag helpers — the one place tag strings are parsed.
 *
 * Areas and projects are **not documents** in this app. They are a tag
 * convention stored in the plain `tags: [String]` field on `GoalItem` and
 * `RoutineItem`:
 *
 *   area:health:fitness   project:dashboard   morning
 *
 * Before this module the splitting was re-implemented per call site
 * (`AreasTime.vue`, `ProjectsTime.vue`, `AreaSidebar.vue`, `ProjectSidebar.vue`,
 * `GoalTagsInput.vue`), which is how `area:health:fitness` ended up rendering
 * three different ways. Every new call site uses these helpers.
 *
 * Spec: `docs/redesign/chassis.md` § "Hierarchical `:` tags".
 */

/** The two tag prefixes that carry a meaning beyond "label". */
export const TAG_KINDS = ['area', 'project'];

/** Separator between levels. */
export const TAG_SEPARATOR = ':';

/**
 * Canonical form of a typed tag.
 *
 * Trim, whitespace -> `-`, collapse `::+` -> `:`, strip leading/trailing `:`.
 * Returns `''` for anything that normalises to nothing (`'  '`, `':'`, `null`).
 *
 * @param {*} v - raw user input
 * @returns {string} the normalised tag, or `''`
 */
export function normTag(v) {
  return String(v == null ? '' : v)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/:{2,}/g, ':')
    .replace(/^:+|:+$/g, '');
}

/**
 * Split a tag into its levels, for per-segment chip rendering.
 *
 * @param {string} tag
 * @returns {string[]} one entry per level; `[]` for an empty tag
 */
export function tagSegments(tag) {
  const t = String(tag == null ? '' : tag);
  if (!t) return [];
  return t.split(TAG_SEPARATOR);
}

/**
 * `area` / `project` if the tag opens with one of those, else `null`.
 *
 * A bare `area` still counts as kind `area` — the kind lives in segment 0
 * whether or not the tag has children.
 *
 * @param {string} tag
 * @returns {'area'|'project'|null}
 */
export function tagKind(tag) {
  const first = (tagSegments(tag)[0] || '').toLowerCase();
  return TAG_KINDS.indexOf(first) >= 0 ? first : null;
}

/**
 * Title-case one `kebab-case` segment: `half-marathon` -> `Half Marathon`.
 *
 * @param {string} segment
 * @returns {string}
 */
export function titleCaseSegment(segment) {
  return String(segment == null ? '' : segment)
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Human breadcrumb for the chat context card ("Before you start").
 *
 * Drops the kind segment (`area` / `project`) and title-cases the rest, so
 * `area:health:fitness` -> `['Health', 'Fitness']`. A tag with no kind keeps
 * every segment (`deep-focus` -> `['Deep Focus']`).
 *
 * @param {string} tag
 * @returns {string[]} segments, ready to join with `' › '` or a left border
 */
export function breadcrumbSegments(tag) {
  const segments = tagSegments(tag);
  const rest = tagKind(tag) ? segments.slice(1) : segments;
  return rest.map(titleCaseSegment);
}

/**
 * Every parent prefix of a tag, shallowest first — the tag itself excluded.
 *
 * `area:health:fitness` -> `['area', 'area:health']`.
 *
 * Needed because a vocabulary often names only leaves; the suggestion universe
 * has to contain the intermediate levels so `area:` can be drilled into.
 *
 * @param {string} tag
 * @returns {string[]}
 */
export function ancestorPrefixes(tag) {
  const segments = tagSegments(tag);
  const out = [];
  for (let i = 1; i < segments.length; i += 1) {
    out.push(segments.slice(0, i).join(TAG_SEPARATOR));
  }
  return out;
}

/**
 * The tags exactly one level deeper than `tag` — its direct children only.
 *
 * `childrenOf('area', [...])` returns `area:health`, never `area:health:sleep`.
 * An empty scope returns the top-level tags.
 *
 * @param {string} tag - the scope ('' for top level)
 * @param {string[]} universe - the known vocabulary to look in
 * @returns {string[]} de-duplicated children, in universe order
 */
export function childrenOf(tag, universe = []) {
  const scope = String(tag == null ? '' : tag);
  const depth = scope ? tagSegments(scope).length + 1 : 1;
  const prefix = scope ? scope + TAG_SEPARATOR : '';
  const seen = new Set();
  return (universe || []).filter((candidate) => {
    const t = String(candidate == null ? '' : candidate);
    if (!t || seen.has(t)) return false;
    if (prefix && t.indexOf(prefix) !== 0) return false;
    if (tagSegments(t).length !== depth) return false;
    seen.add(t);
    return true;
  });
}

/**
 * The suggestion universe: the known vocabulary, plus every tag in use, plus
 * every ancestor prefix of both — de-duplicated.
 *
 * @param {...(string[]|Object)} sources - tag arrays and/or tag->count maps
 * @returns {string[]}
 */
export function buildTagUniverse(...sources) {
  const known = new Set();
  sources.forEach((source) => {
    if (!source) return;
    const list = Array.isArray(source) ? source : Object.keys(source);
    list.forEach((raw) => {
      const t = String(raw == null ? '' : raw);
      if (t) known.add(t);
    });
  });
  // Snapshot first: adding ancestors while iterating a live Set would re-walk
  // the entries it just inserted.
  [...known].forEach((tag) => ancestorPrefixes(tag).forEach((p) => known.add(p)));
  return [...known];
}
