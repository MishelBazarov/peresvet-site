// Общие данные клуба. Всё, что меняется (телефон, залы, ссылки), правим здесь —
// и это обновится на всех страницах сразу.

export const club = {
  name: 'Пересвет',
  fullName: 'Центр традиционных боевых искусств «Пересвет»',
  city: 'Армавир',
  region: 'Краснодарский край',
  // Телефон из карточки 2ГИС. TODO: подтвердить, что это основной номер для записи.
  phone: '+7 900 271-46-56',
  phoneHref: 'tel:+79002714656',
  // TODO: почта для заявок
  email: '',
  socials: [
    { name: 'Одноклассники', url: 'https://ok.ru/group/52417902477499' },
  ] as { name: string; url: string }[],
  minAge: 5,
};

export type Hall = {
  id: string;
  name: string;
  address: string;
  note?: string;
  yandex: string;
  gis?: string;
  isNew?: boolean;
};

export const halls: Hall[] = [
  {
    id: 'volodarskogo',
    name: 'Зал на Володарского',
    address: 'ул. Володарского, 55, 2 этаж',
    note: 'район 3-й городской больницы',
    yandex: 'https://yandex.ru/maps/?text=' + encodeURIComponent('Армавир, улица Володарского, 55'),
    gis: 'https://2gis.ru/armawir/firm/70000001007038867',
    isNew: true,
  },
];

// 1 зал, 2 зала, 5 залов
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const disciplines = [
  {
    id: 'rukopashnyy-boy',
    title: 'Рукопашный бой',
    tag: 'Спорт',
    text: 'Спортивное единоборство: удары руками и ногами, броски, борьба. Соревнования по правилам Федерации рукопашного боя, путь к разрядам и званию мастера спорта.',
  },
  {
    id: 'universalnyy-boy',
    title: 'Универсальный бой',
    tag: 'Спорт',
    text: 'Комплексный вид спорта: поединок в стойке и в партере плюс кросс. Развивает и технику, и выносливость.',
  },
  {
    id: 'russkiy-rukopashnyy-boy',
    title: 'Русский рукопашный бой',
    tag: 'Традиция',
    text: 'Традиционная система: история воинского искусства России, строевые приёмы с оружием и без оружия.',
  },
  {
    id: 'zdrava',
    title: 'Гимнастика «Здрава»',
    tag: 'Здоровье',
    text: 'Оздоровительная славянская гимнастика: гибкость, дыхание, крепкая спина и суставы.',
  },
  {
    id: 'akrobatika',
    title: 'Боевая акробатика',
    tag: 'Основа',
    text: 'Падения, перекаты, кувырки. Ребёнок учится безопасно падать и уверенно владеть телом.',
  },
];

export const nav = [
  { href: '/o-klube/', label: 'Клуб' },
  { href: '/trenery/', label: 'Тренеры' },
  { href: '/boytsy/', label: 'Бойцы' },
  { href: '/novosti/', label: 'Новости' },
  { href: '/blog/', label: 'Блог' },
  { href: '/zaly/', label: halls.length > 1 ? 'Залы' : 'Зал' },
];

// Где не показываем всплывающую форму
export const noPopupPaths = ['/zapis/', '/politika/', '/soglasie/'];
