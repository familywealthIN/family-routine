/* eslint-env jest */
/**
 * htmlToText — the inline teaser of an agent transcript.
 *
 * The point of these tests is not formatting. It is that nothing executable
 * survives: the goal-item page shows this string as text, and the only place the
 * real markup is ever rendered is AgentResultModal's sandboxed iframe.
 */
const { htmlToText } = require('./htmlPreview');

describe('htmlToText — nothing executable survives', () => {
  it('drops tags and keeps their text', () => {
    expect(htmlToText('<p><b>PR #482</b> merged</p>')).toBe('PR #482 merged');
  });

  it('drops script and style bodies entirely', () => {
    const html = '<p>Done</p><script>alert(1)</script><style>b{color:red}</style>';
    expect(htmlToText(html)).toBe('Done');
  });

  it('keeps an attribute payload out of the output', () => {
    expect(htmlToText('<img src=x onerror="alert(1)">after')).toBe('after');
  });

  it('never returns a tag character from markup', () => {
    const out = htmlToText('<div onclick="x"><span>a</span></div>');
    expect(out).not.toMatch(/[<>]/);
  });
});

describe('htmlToText — readability', () => {
  it('turns block boundaries into single newlines', () => {
    expect(htmlToText('<p>one</p><p>two</p>')).toBe('one\ntwo');
  });

  it('renders list items on their own lines', () => {
    expect(htmlToText('<ul><li>a</li><li>b</li></ul>')).toBe('a\nb');
  });

  it('decodes the entities a transcript actually uses', () => {
    expect(htmlToText('<p>a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;</p>'))
      .toBe('a & b <c> "d" \'e\'');
  });

  it('collapses runs of whitespace', () => {
    expect(htmlToText('<p>a    b</p>')).toBe('a b');
  });

  it('is empty for empty input', () => {
    expect(htmlToText('')).toBe('');
    expect(htmlToText(null)).toBe('');
    expect(htmlToText(undefined)).toBe('');
  });
});
