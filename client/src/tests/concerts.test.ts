import { describe, expect, it } from 'vitest';
import { calendarDays, filterConcerts, splitByDate } from '../utils/concerts';
import { returnPath, signInFor } from '../routes/paths';
import { concert } from './fixtures';

const rennes = { ...concert, id: 'rennes', title: 'Rêves Tour', city: 'Ренн', genre: 'underground', place: 'L’Étage' };
const events = [concert, rennes];

describe('Поиск афиш', () => {
  it('сопоставляет все слова из разных полей без учёта регистра, акцентов и лишних пробелов', () => {
    expect(filterConcerts(events, '  ETAGE    reves ', 'underground', 'Ренн')).toEqual([rennes]);
    expect(filterConcerts(events, 'reves rockhal', 'all', '')).toEqual([]);
  });

  it('учитывает и город, и жанр, даже если название подошло', () => {
    expect(filterConcerts(events, 'reves', 'classical', 'Ренн')).toEqual([]);
    expect(filterConcerts(events, 'reves', 'underground', 'Берлин')).toEqual([]);
  });

  it('возвращает весь каталог при пустом запросе и сброшенных фильтрах', () => {
    expect(filterConcerts(events, '   ', 'all', '')).toEqual(events);
  });
});

describe('Даты', () => {
  it('оставляет сегодняшний концерт в ближайших и сортирует архив от нового к старому', () => {
    const on = (date: string) => ({ ...concert, date });
    const yesterday = on('2026-11-19'), before = on('2026-11-10');
    const today = on('2026-11-20'), tomorrow = on('2026-11-21');
    expect(splitByDate([before, tomorrow, yesterday, today], today.date)).toEqual({
      upcoming: [today, tomorrow], archive: [yesterday, before],
    });
  });

  it('строит календарь с 31 декабря до последнего дня високосного февраля включительно', () => {
    const days = calendarDays('2023-12-31');
    expect(days[0]).toBe('2023-12-31');
    expect(days.at(-1)).toBe('2024-02-29');
    expect(new Set(days).size).toBe(61);
    expect(days).toHaveLength(61);
  });
});

describe('Возврат после входа', () => {
  it('восстанавливает адрес покупки или оценки выбранного концерта', () => {
    for (const target of ['/events/witcher/checkout', '/events/witcher#rating']) {
      const loginUrl = new URL(signInFor(target), 'http://localhost');
      expect(returnPath(loginUrl.search)).toBe(target);
    }
  });

  it('открывает профиль при отсутствии адреса или при неизвестном адресе', () => {
    expect(returnPath('')).toBe('/profile');
    expect(returnPath('?next=/missing')).toBe('/profile');
  });
});
