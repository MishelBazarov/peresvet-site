// Заявки: всплывающее окно через 12 секунд на сайте, кнопки «Записаться», отправка формы.
import { setMenu } from './ui';

const DELAY_MS = 12_000;
const DISMISS_DAYS = 3;
const K_FIRST = 'pv-first-visit';
const K_DISMISSED = 'pv-lead-dismissed';
const K_SENT = 'pv-lead-sent';

function read(key: string, storage: 'local' | 'session' = 'local') {
  try { return (storage === 'local' ? localStorage : sessionStorage).getItem(key); } catch { return null; }
}
function write(key: string, value: string, storage: 'local' | 'session' = 'local') {
  try { (storage === 'local' ? localStorage : sessionStorage).setItem(key, value); } catch { /* приватный режим */ }
}

const dialog = document.querySelector<HTMLDialogElement>('[data-lead-dialog]');

function openLead() {
  if (!dialog || dialog.open) return;
  setMenu(false);
  dialog.showModal();
  window.__lenis?.stop();
  dialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
}

dialog?.addEventListener('close', () => {
  window.__lenis?.start();
  if (!read(K_SENT)) write(K_DISMISSED, String(Date.now()));
});
dialog?.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close(); // клик по затемнению
});
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('[data-open-lead]')) {
    e.preventDefault();
    openLead();
  } else if (target.closest('[data-close-lead]')) {
    dialog?.close();
  }
});

// Таймер считает время на сайте целиком, а не на одной странице
(function scheduleAutoOpen() {
  if (!dialog) return;
  const excluded: string[] = JSON.parse(dialog.dataset.noPopup || '[]');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = location.pathname.slice(base.length) || '/';
  if (excluded.includes(path)) return;
  if (read(K_SENT)) return;
  const dismissed = Number(read(K_DISMISSED) || 0);
  if (dismissed && Date.now() - dismissed < DISMISS_DAYS * 864e5) return;

  let first = Number(read(K_FIRST, 'session') || 0);
  if (!first) {
    first = Date.now();
    write(K_FIRST, String(first), 'session');
  }
  const tryOpen = () => {
    const busy =
      document.visibilityState !== 'visible' ||
      document.querySelector('dialog[open]') ||
      document.querySelector('[data-mobile-menu]:not([hidden])') ||
      document.activeElement?.matches('input, textarea, select');
    if (busy) setTimeout(tryOpen, 5000);
    else openLead();
  };
  setTimeout(tryOpen, Math.max(1500, DELAY_MS - (Date.now() - first)));
})();

// Маска телефона: +7 (900) 271-46-56
function formatPhone(value: string) {
  let d = value.replace(/\D/g, '');
  if (!d) return '';
  if (d[0] === '8') d = '7' + d.slice(1);
  if (d[0] !== '7') d = '7' + d;
  d = d.slice(0, 11);
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  let out = '+7';
  if (p[0]) out += ` (${p[0]}`;
  if (p[0].length === 3) out += ')';
  if (p[1]) out += ` ${p[1]}`;
  if (p[2]) out += `-${p[2]}`;
  if (p[3]) out += `-${p[3]}`;
  return out;
}
document.querySelectorAll<HTMLInputElement>('[data-phone]').forEach((input) => {
  input.addEventListener('input', () => { input.value = formatPhone(input.value); });
});

document.querySelectorAll<HTMLFormElement>('[data-lead-form]').forEach((form) => {
  const error = form.querySelector<HTMLElement>('[data-lf-error]');
  const done = form.querySelector<HTMLElement>('[data-lf-done]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  const fail = (message: string, field?: HTMLElement | null) => {
    if (error) { error.textContent = message; error.hidden = false; }
    field?.setAttribute('aria-invalid', 'true');
    (field as HTMLInputElement | null)?.focus();
  };

  form.addEventListener('input', (e) => (e.target as HTMLElement).removeAttribute('aria-invalid'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (error) error.hidden = true;
    const name = form.elements.namedItem('name') as HTMLInputElement;
    const phone = form.elements.namedItem('phone') as HTMLInputElement;
    const consent = form.elements.namedItem('consent') as HTMLInputElement;

    if (name.value.trim().length < 2) return fail('Напишите, как к вам обращаться.', name);
    if (phone.value.replace(/\D/g, '').length < 11) return fail('Проверьте номер телефона: нужно 11 цифр.', phone);
    if (!consent.checked) return fail('Без согласия на обработку данных мы не можем принять заявку.', consent);

    // В превью для тренеров заявки никуда не уходят — честно говорим об этом
    if (document.documentElement.hasAttribute('data-preview')) {
      const phoneLink = document.querySelector<HTMLAnchorElement>('.lf-or a');
      fail(`Это черновик сайта: заявки пока не отправляются. Записаться можно по телефону ${phoneLink?.textContent ?? ''}`);
      return;
    }

    if (submit) { submit.disabled = true; submit.textContent = 'Отправляем…'; }
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'send failed');
      form.classList.add('sent');
      if (done) done.hidden = false;
      write(K_SENT, String(Date.now()));
    } catch {
      const phoneLink = document.querySelector<HTMLAnchorElement>('.lf-or a');
      fail(`Не получилось отправить заявку. Позвоните нам: ${phoneLink?.textContent ?? ''}`);
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = 'Отправить заявку'; }
    }
  });
});
