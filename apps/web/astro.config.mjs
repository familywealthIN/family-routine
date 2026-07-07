import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://routinenotes.ai',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap(), icon({ include: { ph: ['*'] } })],
  vite: { plugins: [tailwindcss()] },
  prefetch: { defaultStrategy: 'viewport' },
  experimental: { clientPrerender: true },
});
