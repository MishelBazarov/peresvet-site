// Шапка, мобильное меню, фильтр новостей.

const header = document.querySelector<HTMLElement>('[data-header]');
const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 24);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const burger = document.querySelector<HTMLButtonElement>('[data-burger]');
const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');

export function setMenu(open: boolean) {
  if (!burger || !menu) return;
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  menu.hidden = !open;
  header?.classList.toggle('menu-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) window.__lenis?.stop();
  else window.__lenis?.start();
}

burger?.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && burger?.getAttribute('aria-expanded') === 'true') setMenu(false);
});
window.matchMedia('(min-width: 921px)').addEventListener('change', (e) => e.matches && setMenu(false));

// Фильтр новостей по типу
const filters = document.querySelectorAll<HTMLButtonElement>('[data-filter]');
filters.forEach((btn) => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    document.querySelectorAll<HTMLElement>('[data-news-list] [data-type]').forEach((card) => {
      card.hidden = type !== 'all' && card.dataset.type !== type;
    });
    const empty = document.querySelector<HTMLElement>('[data-news-empty]');
    if (empty) {
      const anyVisible = [...document.querySelectorAll<HTMLElement>('[data-news-list] [data-type]')].some((c) => !c.hidden);
      empty.hidden = anyVisible;
    }
  });
});
