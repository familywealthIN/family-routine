/**
 * A deliberately tiny inline-markdown renderer for help content.
 *
 * Help copy is authored by us in `src/lib/help/articles/*`, never by users, but
 * it still gets HTML-escaped first so a stray `<` in an example renders as text
 * rather than markup. Supported: **bold**, *italic*, `code`, [text](href).
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Only allow hrefs we control or that are plainly safe schemes. */
function safeHref(href: string): string {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|#|\/)/i.test(trimmed)) return trimmed;
  return '#';
}

export function inlineMarkdown(input: string): string {
  let html = escapeHtml(input);

  // `code`
  html = html.replace(/`([^`]+)`/g, '<code class="help-code">$1</code>');

  // **bold** first, so the italic pass below never sees a bold delimiter.
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // *italic* — used throughout for UI strings quoted verbatim from the app.
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // [text](href) — href was escaped above, so unescape the few entities that
  // legitimately appear in a URL before validating it.
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text: string, href: string) => {
    const url = safeHref(href.replace(/&amp;/g, '&'));
    const external = /^https?:/i.test(url) && !url.includes('routinenotes.ai');
    const attrs = external ? ' target="_blank" rel="noopener"' : '';
    return `<a class="help-link" href="${escapeHtml(url)}"${attrs}>${text}</a>`;
  });

  return html;
}
