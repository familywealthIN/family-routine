import readResponseBody from '../responseBody';

const reply = (body, type) => ({
  text: async () => body,
  headers: { get: (name) => (name.toLowerCase() === 'content-type' ? type : null) },
});

describe('readResponseBody', () => {
  it('parses a JSON reply', async () => {
    await expect(readResponseBody(reply('{"ok":true}', 'application/json; charset=utf-8')))
      .resolves.toEqual({ ok: true });
  });

  it('keeps an empty or broken JSON reply as text instead of throwing', async () => {
    await expect(readResponseBody(reply('', 'application/json'))).resolves.toBe('');
    await expect(readResponseBody(reply('Workflow was started', 'application/json')))
      .resolves.toBe('Workflow was started');
  });

  it('returns HTML and other text as sent', async () => {
    await expect(readResponseBody(reply('<p>done</p>', 'text/html'))).resolves.toBe('<p>done</p>');
    await expect(readResponseBody(reply('plain', null))).resolves.toBe('plain');
  });
});
