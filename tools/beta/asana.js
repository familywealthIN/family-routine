/* eslint-disable no-console */
// Thin Asana REST v1.0 client shared by the beta-test tooling.
// Token comes from ASANA_ACCESS_TOKEN in the repo-root .env (gitignored).
const fs = require('fs');
const path = require('path');

function loadToken() {
  if (process.env.ASANA_ACCESS_TOKEN) return process.env.ASANA_ACCESS_TOKEN.trim();
  const envPath = path.join(__dirname, '..', '..', '.env');
  const line = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('ASANA_ACCESS_TOKEN='));
  if (!line) throw new Error('ASANA_ACCESS_TOKEN not found in .env');
  return line.slice('ASANA_ACCESS_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
}

const TOKEN = loadToken();

async function api(method, url, body) {
  const res = await fetch(`https://app.asana.com/api/1.0${url}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify({ data: body }) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url} -> ${JSON.stringify(json.errors || json)}`);
  return json.data;
}

const IDS = {
  workspace: '1207860307703002',
  project: '1207860307324832',
  sectionTodo: '1207860307324833',
  epic2026w34: '1217517967742541', // "Beta Test fixes" - the 16-22 Aug run
};

module.exports = { api, IDS, TOKEN };
