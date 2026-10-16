// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Основной домен: пересвет-армавир.рф (в punycode).
// Для превью на GitHub Pages сборка запускается с переменными окружения:
//   PREVIEW=1 SITE_URL=https://mishelbazarov.github.io SITE_BASE=/peresvet-site
const SITE = process.env.SITE_URL || 'https://xn----8sbafdnab5a1b0anfefs.xn--p1ai';
const BASE = (process.env.SITE_BASE || '').replace(/\/$/, '');
const PREVIEW = process.env.PREVIEW === '1';

/**
 * Сайт написан с абсолютными ссылками ("/trenery/"). Если он лежит в подпапке
 * (GitHub Pages: /peresvet-site/), после сборки дописываем подпапку ко всем ссылкам.
 * Для превью ещё убираем PHP-обработчик заявок: на GitHub Pages он не работает.
 * @returns {import('astro').AstroIntegration}
 */
function previewTweaks() {
  return {
    name: 'peresvet-preview',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir); // путь с кириллицей, не dir.pathname
        if (PREVIEW) await rm(join(root, 'api'), { recursive: true, force: true });
        if (!BASE) return;
        const esc = BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(\\s(?:href|src|action))="(\\/(?!\\/)(?!${esc.slice(1)}\\/)[^"]*)"`, 'g');
        const walk = async (d) => {
          for (const e of await readdir(d, { withFileTypes: true })) {
            const p = join(d, e.name);
            if (e.isDirectory()) await walk(p);
            else if (e.name.endsWith('.html')) {
              const html = await readFile(p, 'utf8');
              await writeFile(p, html.replace(re, (_, attr, url) => `${attr}="${BASE}${url}"`));
            }
          }
        };
        await walk(root);
      },
    },
  };
}

export default defineConfig({
  site: SITE,
  base: BASE || undefined,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap(), previewTweaks()],
});
