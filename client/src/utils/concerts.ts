import type { Concert } from '../types';

export const genres = {
  all: 'Вся музыка',
  classical: 'Классика',
  modern: 'Электроника',
  underground: 'Андеграунд',
  soundtrack: 'Саундтреки',
};
export const today = () =>
  new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeZone: 'Asia/Novosibirsk' }).format(new Date());
export function calendarLabel(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('ru-RU', { ...options, timeZone: 'UTC' }).format(
    new Date(day + 'T12:00:00Z'),
  );
}
export function dateLabel(event: { date: string; dateLabel?: string | null }) {
  return event.dateLabel || calendarLabel(event.date, { day: 'numeric', month: 'long', year: 'numeric' });
}
export function calendarDays(first: string) {
  const date = new Date(first + 'T12:00:00Z');
  const year = date.getUTCFullYear(),
    month = date.getUTCMonth() + 2;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const until = Date.UTC(year, month, Math.min(lastDay, date.getUTCDate()), 12);
  const result: string[] = [];
  for (; date.getTime() <= until; date.setUTCDate(date.getUTCDate() + 1))
    result.push(date.toISOString().slice(0, 10));
  return result;
}
const normalize = (text: string) =>
  text
    .trim()
    .toLocaleLowerCase('ru')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
export function filterConcerts(events: Concert[], query: string, genre: string, city: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return events.filter((event) => {
    if (city && event.city !== city) return false;
    if (genre !== 'all' && event.genre !== genre) return false;
    const searchable = normalize([event.title, event.kind, event.place, event.artist, event.city].join(' '));
    return words.every((word) => searchable.includes(word));
  });
}
export function splitByDate(events: Concert[], day: string) {
  const upcoming = events.filter((e) => e.date >= day).sort((a, b) => a.date.localeCompare(b.date));
  const archive = events.filter((e) => e.date < day).sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, archive };
}
export const formatRating = (value: number) =>
  value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
