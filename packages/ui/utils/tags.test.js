/* eslint-env jest */
/**
 * Unit tests for the hierarchical `:` tag helpers.
 *
 * These replace the per-call-site splitters that used to live in AreasTime.vue,
 * ProjectsTime.vue, AreaSidebar.vue and ProjectSidebar.vue, so the cases below
 * are written against the shapes those call sites fed in.
 *
 * Spec: docs/redesign/chassis.md § "Hierarchical `:` tags".
 */
const {
  normTag,
  tagSegments,
  tagKind,
  titleCaseSegment,
  breadcrumbSegments,
  ancestorPrefixes,
  childrenOf,
  buildTagUniverse,
  TAG_KINDS,
} = require('./tags');

describe('normTag', () => {
  it('trims the edges', () => {
    expect(normTag('  area:health  ')).toBe('area:health');
  });

  it('turns any run of whitespace into a single hyphen', () => {
    expect(normTag('deep   focus')).toBe('deep-focus');
    expect(normTag('half\tmarathon')).toBe('half-marathon');
  });

  it('collapses repeated colons', () => {
    expect(normTag('area::health:::fitness')).toBe('area:health:fitness');
  });

  it('strips leading and trailing colons', () => {
    expect(normTag(':area:health:')).toBe('area:health');
    expect(normTag('area:')).toBe('area');
  });

  it('returns an empty string for input that normalises to nothing', () => {
    expect(normTag('   ')).toBe('');
    expect(normTag(':')).toBe('');
    expect(normTag('::')).toBe('');
    expect(normTag(null)).toBe('');
    expect(normTag(undefined)).toBe('');
  });
});

describe('tagSegments', () => {
  it('splits on the colon', () => {
    expect(tagSegments('area:health:fitness')).toEqual(['area', 'health', 'fitness']);
  });

  it('returns one segment for a flat tag', () => {
    expect(tagSegments('morning')).toEqual(['morning']);
  });

  it('returns nothing for an empty tag', () => {
    expect(tagSegments('')).toEqual([]);
    expect(tagSegments(null)).toEqual([]);
  });
});

describe('tagKind', () => {
  it('recognises area and project', () => {
    expect(tagKind('area:health:fitness')).toBe('area');
    expect(tagKind('project:dashboard')).toBe('project');
  });

  it('recognises the bare kind with no child level', () => {
    expect(tagKind('area')).toBe('area');
  });

  it('is case-insensitive on the kind segment', () => {
    expect(tagKind('Area:health')).toBe('area');
  });

  it('is null for a plain label', () => {
    expect(tagKind('morning')).toBeNull();
    expect(tagKind('health:fitness')).toBeNull();
    expect(tagKind('')).toBeNull();
  });

  it('only ever returns one of the declared kinds', () => {
    expect(TAG_KINDS).toEqual(['area', 'project']);
  });
});

describe('titleCaseSegment', () => {
  it('title-cases a kebab-case segment', () => {
    expect(titleCaseSegment('half-marathon')).toBe('Half Marathon');
    expect(titleCaseSegment('fitness')).toBe('Fitness');
  });

  it('survives stray hyphens', () => {
    expect(titleCaseSegment('a--b')).toBe('A B');
    expect(titleCaseSegment('')).toBe('');
  });
});

describe('breadcrumbSegments', () => {
  it('drops the kind segment and title-cases the rest', () => {
    expect(breadcrumbSegments('area:health:fitness')).toEqual(['Health', 'Fitness']);
    expect(breadcrumbSegments('project:routine-notes-v2')).toEqual(['Routine Notes V2']);
  });

  it('keeps every segment when there is no kind to drop', () => {
    expect(breadcrumbSegments('deep-focus')).toEqual(['Deep Focus']);
    expect(breadcrumbSegments('health:sleep')).toEqual(['Health', 'Sleep']);
  });

  it('is empty for a bare kind', () => {
    expect(breadcrumbSegments('area')).toEqual([]);
  });

  it('joins into the card subline the chat context card renders', () => {
    expect(breadcrumbSegments('area:work:writing').join(' › ')).toBe('Work › Writing');
  });
});

describe('ancestorPrefixes', () => {
  it('lists every parent prefix, shallowest first, excluding the tag itself', () => {
    expect(ancestorPrefixes('area:health:fitness')).toEqual(['area', 'area:health']);
  });

  it('is empty for a top-level tag', () => {
    expect(ancestorPrefixes('morning')).toEqual([]);
    expect(ancestorPrefixes('')).toEqual([]);
  });
});

describe('childrenOf', () => {
  const UNIVERSE = [
    'area',
    'area:health',
    'area:health:fitness',
    'area:health:sleep',
    'area:work',
    'project:essays',
    'morning',
  ];

  it('returns the direct children only, never grandchildren', () => {
    expect(childrenOf('area', UNIVERSE)).toEqual(['area:health', 'area:work']);
  });

  it('returns the next level down from a deeper scope', () => {
    expect(childrenOf('area:health', UNIVERSE))
      .toEqual(['area:health:fitness', 'area:health:sleep']);
  });

  it('returns the top level for an empty scope', () => {
    expect(childrenOf('', UNIVERSE)).toEqual(['area', 'morning']);
  });

  it('is empty for a leaf and for an unknown scope', () => {
    expect(childrenOf('area:health:fitness', UNIVERSE)).toEqual([]);
    expect(childrenOf('nope', UNIVERSE)).toEqual([]);
  });

  it('does not match a prefix that stops mid-segment', () => {
    expect(childrenOf('area:heal', UNIVERSE)).toEqual([]);
  });

  it('de-duplicates a universe that repeats a tag', () => {
    expect(childrenOf('area', ['area:health', 'area:health'])).toEqual(['area:health']);
  });

  it('tolerates a missing universe', () => {
    expect(childrenOf('area')).toEqual([]);
  });
});

describe('buildTagUniverse', () => {
  it('unions the vocabulary with the tags in use', () => {
    expect(buildTagUniverse(['morning'], ['evening']).sort())
      .toEqual(['evening', 'morning']);
  });

  it('adds every ancestor prefix of every source tag', () => {
    expect(buildTagUniverse(['area:health:fitness']).sort())
      .toEqual(['area', 'area:health', 'area:health:fitness']);
  });

  it('accepts a tag->count usage map as a source', () => {
    expect(buildTagUniverse([], { 'project:essays': 3 }).sort())
      .toEqual(['project', 'project:essays']);
  });

  it('de-duplicates across sources and ignores empty entries', () => {
    const universe = buildTagUniverse(['area:health', 'area'], ['area:health'], null, ['', null]);
    expect(universe.sort()).toEqual(['area', 'area:health']);
  });
});
