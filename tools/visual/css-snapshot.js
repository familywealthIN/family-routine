// node css-snapshot.js <distDir> <out.json>
// Normalised list of CSS rules per chunk, in order. Scoped data-v hashes are
// replaced by a per-chunk index so a moved <style scoped src> compares equal.
const fs = require('fs');
const path = require('path');
const postcss = require(require.resolve('postcss', { paths: [process.cwd()] }));

const [dist, out] = process.argv.slice(2);
const dir = path.join(dist, 'css');
const snap = {};
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.css')).sort()) {
  const chunk = file.replace(/\.[0-9a-f]{8}\.css$/, '');
  const root = postcss.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const ids = new Map();
  const rules = [];
  root.walk((node) => {
    if (node.type === 'comment') return;
    if (node.type === 'rule' || node.type === 'atrule') {
      if (node.type === 'rule' && node.parent.type === 'atrule' && /keyframes/.test(node.parent.name)) return;
      let head = node.type === 'rule' ? node.selector : `@${node.name} ${node.params}`;
      head = head.replace(/data-v-[0-9a-f]{8}/g, (m) => { if (!ids.has(m)) ids.set(m, ids.size); return `data-v-#${ids.get(m)}`; });
      const decls = (node.nodes || []).filter((n) => n.type === 'decl').map((d) => `${d.prop}:${d.value}${d.important ? '!important' : ''}`).join(';');
      const kf = node.type === 'atrule' && /keyframes/.test(node.name) ? node.toString().replace(/\s+/g, '') : '';
      rules.push(`${head}{${decls}}${kf}`);
    }
  });
  snap[chunk] = rules;
}
fs.writeFileSync(out, JSON.stringify(snap, null, 1));
console.log(Object.entries(snap).map(([k, v]) => `${k}: ${v.length}`).join('\n'));
