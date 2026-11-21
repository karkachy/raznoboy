import { useEffect, useMemo, useRef, useState } from 'react';
import { calendarDays, calendarLabel } from '../utils/concerts';

export function Calendar({
  today,
  date,
  select,
}: {
  today: string;
  date: string | null;
  select: (value: string | null) => void;
}) {
  const days = useMemo(() => calendarDays(today), [today]);
  const rail = useRef<HTMLDivElement>(null);
  const [first, setFirst] = useState(today);
  const [edges, setEdges] = useState({ start: true, end: false });
  function update() {
    const el = rail.current;
    if (!el) return;
    const left = el.getBoundingClientRect().left;
    const item = Array.from(el.children).find(
      (c) => c.getBoundingClientRect().right > left + c.clientWidth / 2,
    ) as HTMLElement | undefined;
    setFirst(item?.dataset.day || today);
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollWidth - el.clientWidth - el.scrollLeft <= 2 });
  }
  useEffect(() => {
    const el = rail.current!;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [today]);
  function scroll(direction: number) {
    const el = rail.current!;
    el.scrollBy({
      left: direction * el.clientWidth * 0.9,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
  return (
    <section className="af-dates" aria-label="Выбрать дату">
      <div className="af-head">
        <div>
          <h2>Выбрать дату</h2>
          <p className="af-muted">{calendarLabel(first, { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="af-actions">
          <button className="af-reset" aria-pressed={!date} onClick={() => select(null)}>
            Все даты
          </button>
          <button
            className="af-icon"
            aria-label="Предыдущие даты"
            disabled={edges.start}
            onClick={() => scroll(-1)}
          >
            ‹
          </button>
          <button
            className="af-icon"
            aria-label="Следующие даты"
            disabled={edges.end}
            onClick={() => scroll(1)}
          >
            ›
          </button>
        </div>
      </div>
      <div className="af-rail" ref={rail} onScroll={update}>
        {days.map((day) => {
          const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
          const weekend = weekday === 0 || weekday === 6;
          return (
            <button
              className="af-day"
              data-day={day}
              key={day}
              aria-pressed={day === date}
              aria-label={
                calendarLabel(day, { day: 'numeric', month: 'long', weekday: 'long' }) +
                (weekend ? ', выходной' : '')
              }
              onClick={() => select(day === date ? null : day)}
            >
              <small>{day === today ? 'Сегодня' : calendarLabel(day, { weekday: 'short' })}</small>
              <b>{Number(day.slice(-2))}</b>
              <span aria-hidden="true">{weekend ? '•' : ''}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
