// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Основной домен: пересвет-армавир.рф (в punycode). Если выберем другой, меняем здесь.
export default defineConfig({
  site: 'https://xn----8sbafdnab5a1b0anfefs.xn--p1ai',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
