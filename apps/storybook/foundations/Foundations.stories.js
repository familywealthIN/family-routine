// The design tokens, drawn from packages/design/tokens.json: the same file the
// Claude Design project's tokens.css is generated from, so Storybook and Claude
// Design show one set of colours, type, spacing, radii and shadows.
import tokens from '../../../packages/design/tokens.json';

export default {
  title: 'Foundations/Tokens',
  parameters: { controls: { hideNoControlsWarning: true } },
};

const theme = tokens.color.themes[0].id;
const raw = (token) => (typeof token.value === 'string' ? token.value : token.value[theme]);
const byName = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t]));
// "{primary}" is an alias for another token.
const resolve = (token) => {
  const value = raw(token);
  const alias = /^\{(.+)\}$/.exec(value);
  return alias && byName[alias[1]] ? resolve(byName[alias[1]]) : value;
};
const familyOf = (name) => tokens.type.families[name];
const px = (v) => (typeof v === 'number' ? String(v) : v);

const page = 'font-family: "Plus Jakarta Sans", system-ui, sans-serif; color: rgba(0,0,0,.87); padding: 8px;';
const name = 'font: 600 13px/1.3 ui-monospace, Menlo, monospace;';
const note = 'font-size: 12px; line-height: 1.4; color: rgba(0,0,0,.54);';

export const Colors = () => ({
  data: () => ({ list: tokens.color.tokens.map((t) => ({ ...t, css: resolve(t) })), page, name, note }),
  template: `
    <div :style="page + 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px'">
      <div v-for="t in list" :key="t.name" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.12)">
        <div :style="{ background: t.css, height: '56px', borderBottom: '1px solid rgba(0,0,0,.06)' }"></div>
        <div style="padding:10px 12px">
          <div :style="name">--{{ t.name }}</div>
          <div :style="note">{{ t.value }}</div>
          <div :style="note + 'margin-top:4px'">{{ t.usage }}</div>
        </div>
      </div>
    </div>`,
});

export const Type = () => ({
  data: () => ({
    groups: tokens.type.groups.map((g) => ({
      ...g,
      styles: g.styles.map((s) => ({
        ...s,
        css: {
          font: `${s.fontWeight} ${px(s.fontSize)}/${px(s.lineHeight)} ${familyOf(g.family)}`,
          letterSpacing: s.letterSpacing || 'normal',
          textTransform: s.textTransform || 'none',
        },
      })),
    })),
    page,
    name,
    note,
  }),
  template: `
    <div :style="page">
      <section v-for="g in groups" :key="g.name" style="margin-bottom:24px">
        <div :style="note + 'text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:8px'">{{ g.name }}</div>
        <div v-for="s in g.styles" :key="s.name" style="display:flex;align-items:baseline;gap:16px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.08)">
          <div style="width:180px;flex:none">
            <div :style="name">.t-{{ s.name }}</div>
            <div :style="note">{{ s.fontWeight }} · {{ s.fontSize }} / {{ s.lineHeight }}</div>
          </div>
          <div :style="s.css">Deep Work, 09:00 to 12:00</div>
        </div>
      </section>
    </div>`,
});

export const Spacing = () => ({
  data: () => ({ list: tokens.spacing.tokens, page, name, note }),
  template: `
    <div :style="page">
      <div v-for="t in list" :key="t.name" style="display:flex;align-items:center;gap:16px;padding:8px 0">
        <div :style="name + 'width:120px;flex:none'">--{{ t.name }}</div>
        <div :style="{ width: t.value, height: '16px', background: '#288bd5', borderRadius: '3px', flex: 'none' }"></div>
        <div :style="note">{{ t.value }} · {{ t.usage }}</div>
      </div>
    </div>`,
});

export const Radius = () => ({
  data: () => ({ list: tokens.radius.tokens, page, name, note }),
  template: `
    <div :style="page + 'display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px'">
      <div v-for="t in list" :key="t.name">
        <div :style="{ height: '72px', background: '#fff', border: '1px solid rgba(0,0,0,.12)', borderRadius: t.value }"></div>
        <div :style="name + 'margin-top:8px'">--{{ t.name }}</div>
        <div :style="note">{{ t.value }} · {{ t.usage }}</div>
      </div>
    </div>`,
});

export const Shadow = () => ({
  data: () => ({ list: tokens.shadow.tokens, page, name, note }),
  template: `
    <div :style="page + 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:24px;background:#f4f4f4'">
      <div v-for="t in list" :key="t.name">
        <div :style="{ height: '72px', background: '#fff', borderRadius: '16px', boxShadow: t.value }"></div>
        <div :style="name + 'margin-top:10px'">--{{ t.name }}</div>
        <div :style="note">{{ t.usage }}</div>
      </div>
    </div>`,
});
