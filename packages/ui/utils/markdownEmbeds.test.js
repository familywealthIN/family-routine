/* eslint-env jest */
const fs = require('fs');
const path = require('path');
const { splitEmbeds, allowedEmbedSrc, EMBED_HOSTS } = require('./markdownEmbeds');

describe('markdownEmbeds', () => {
  it('splits text and allowed embeds in order', () => {
    const src = 'Intro\n<iframe src="https://player.vimeo.com/video/1" width="640" height="360"></iframe>\nOutro';
    expect(splitEmbeds(src)).toEqual([
      { type: 'markdown', text: 'Intro\n' },
      {
        type: 'embed', src: 'https://player.vimeo.com/video/1', title: 'player.vimeo.com', height: 0, ratio: 360 / 640,
      },
      { type: 'markdown', text: '\nOutro' },
    ]);
  });

  it('keeps a pixel height when only a height is given (Spotify)', () => {
    const [embed] = splitEmbeds('<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/x" width="100%" height="152"></iframe>');
    expect(embed).toMatchObject({ type: 'embed', height: 152, ratio: 0 });
  });

  it('decodes &amp; in a pasted src', () => {
    expect(allowedEmbedSrc('https://www.google.com/maps/embed?pb=1&amp;x=2'))
      .toBe('https://www.google.com/maps/embed?pb=1&x=2');
  });

  it.each([
    ['plain http', 'http://www.youtube.com/embed/a'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['unknown host', 'https://evil.example/embed/a'],
    ['lookalike host', 'https://www.youtube.com.evil.example/embed/a'],
    ['credentials', 'https://user:pw@www.youtube.com/embed/a'],
    ['a non-embed path', 'https://www.youtube.com/watch?v=a'],
    ['nothing', ''],
  ])('refuses %s', (label, src) => {
    expect(allowedEmbedSrc(src)).toBe('');
  });

  it('leaves a refused iframe in the text, and a srcdoc-only one too', () => {
    const text = '<iframe srcdoc="<script>alert(1)</script>"></iframe>';
    expect(splitEmbeds(text)).toEqual([{ type: 'markdown', text }]);
  });

  it('copes with no text', () => {
    expect(splitEmbeds(undefined)).toEqual([]);
  });

  it('every embed host is allowed by the app CSP frame-src', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../../apps/web-app/public/index.html'), 'utf8');
    const frameSrc = /frame-src([^;]*);/.exec(html)[1].split(/\s+/);
    Object.keys(EMBED_HOSTS).forEach((host) => {
      expect(frameSrc).toContain(`https://${host}`);
    });
  });
});
