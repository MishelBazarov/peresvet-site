// robots.txt: превью на GitHub Pages закрыто от поисковиков, основной сайт открыт
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const preview = import.meta.env.PREVIEW === '1' || process.env.PREVIEW === '1';
  const body = preview
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site + import.meta.env.BASE_URL.replace(/^\//, '')).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
