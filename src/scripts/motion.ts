// Плавная прокрутка (Lenis) и анимации (GSAP + ScrollTrigger).
// Если у человека включено «уменьшение движения», ничего не анимируем.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

declare global {
  interface Window { __lenis?: Lenis }
}

const root = document.documentElement;
root.classList.add('motion-ok');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce) {
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Якорные ссылки — тоже плавно
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -96 });
    });
  });

  // Заголовок по буквам: каждая буква поднимается из-под линии
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const text = el.textContent ?? '';
    // градиент переносим с заголовка на каждую букву, иначе при сдвиге букв он ломается
    const gold = el.classList.contains('gold-text');
    el.classList.remove('gold-text');
    el.setAttribute('aria-label', text);
    el.textContent = '';
    for (const ch of text) {
      const outer = document.createElement('span');
      outer.className = 'split-mask';
      outer.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = gold ? 'split-char gold-text' : 'split-char';
      inner.textContent = ch === ' ' ? ' ' : ch;
      outer.appendChild(inner);
      el.appendChild(outer);
    }
    gsap.from(el.querySelectorAll('.split-char'), {
      yPercent: 110,
      duration: 1.3,
      ease: 'expo.out',
      stagger: 0.05,
      delay: 0.25,
    });
  });

  // Первый экран: появляется по очереди
  const intro = gsap.utils.toArray<HTMLElement>('[data-intro]');
  if (intro.length) {
    gsap.fromTo(intro, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: 0.15 });
  }

  // Появление блоков при прокрутке. IntersectionObserver срабатывает при любом способе
  // попасть в место страницы: прокрутка, переход по якорю, восстановление позиции после перезагрузки.
  const revealIO = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
      if (!visible.length) return;
      visible.forEach((el) => revealIO.unobserve(el));
      gsap.to(visible, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, overwrite: true });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => revealIO.observe(el));

  // Параллакс
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax || '0.2');
    gsap.to(el, {
      yPercent: amount * 100,
      ease: 'none',
      scrollTrigger: { trigger: el.closest('section, header') || el, start: 'top top', end: 'bottom top', scrub: true },
    });
  });

  // Бегущая строка: ускоряется от прокрутки и меняет направление
  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((track) => {
    const tween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 36, repeat: -1 });
    ScrollTrigger.create({
      trigger: document.body,
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const speed = 1 + Math.min(Math.abs(self.getVelocity()) / 260, 5);
        gsap.killTweensOf(tween, 'timeScale');
        gsap.to(tween, { timeScale: self.direction * speed, duration: 0.2 });
        gsap.to(tween, { timeScale: self.direction, duration: 1.4, delay: 0.25 });
      },
    });
  });

  // Линия-индикатор прогресса чтения статьи
  const progress = document.querySelector<HTMLElement>('[data-progress]');
  if (progress) {
    gsap.to(progress, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 0, end: 'max', scrub: 0.3 },
    });
  }
}
