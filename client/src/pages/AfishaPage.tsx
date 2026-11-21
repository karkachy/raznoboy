import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { api, errorText } from '../api';
import { useSession } from '../auth/SessionContext';
import { Header } from '../components/Header';
import { Calendar } from '../components/Calendar';
import { Featured } from '../components/Featured';
import { ConcertCard } from '../components/ConcertCard';
import type { Concert } from '../types';
import { calendarLabel, filterConcerts, genres, splitByDate, today } from '../utils/concerts';

export function AfishaPage() {
  const [events, setEvents] = useState<Concert[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [city, setCity] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const { error: sessionError, refresh } = useSession();
  useEffect(() => {
    let current = true;
    setError('');
    api
      .events()
      .then((rows) => {
        if (current) setEvents(rows);
      })
      .catch((err) => {
        if (current) setError(errorText(err));
      });
    return () => {
      current = false;
    };
  }, [attempt]);
  const day = today();
  const cities = [...new Set(events?.map((e) => e.city))].sort((a, b) => a.localeCompare(b, 'ru'));
  const matching = filterConcerts(events ?? [], query, genre, city);
  const selected = matching.filter((e) => !date || e.date === date);
  const { upcoming, archive } = splitByDate(selected, day);
  const featured = splitByDate(
    matching.filter((e) => genre !== 'all' || e.featured),
    day,
  );
  const count = query.trim() ? selected.length : upcoming.length;
  return (
    <div id="afisha-concept" className="af">
      <Header
        query={query}
        city={city}
        cities={cities}
        onCity={(s) => {
          setCity(s);
          setDate(null);
        }}
        onQuery={(s) => {
          setQuery(s);
          setDate(null);
        }}
      />
      <nav className="af-wrap af-tabs" aria-label="Музыкальное направление">
        {Object.entries(genres).map(([key, label]) => (
          <button key={key} aria-pressed={genre === key} onClick={() => setGenre(key)}>
            {label}
          </button>
        ))}
      </nav>
      <main className="af-wrap af-main">
        {sessionError && (
          <p role="alert">
            {sessionError}{' '}
            <button className="af-text-button" onClick={() => void refresh()}>
              Повторить
            </button>
          </p>
        )}
        {error ? (
          <p role="alert">
            {error}{' '}
            <button className="af-text-button" onClick={() => setAttempt((n) => n + 1)}>
              Повторить
            </button>
          </p>
        ) : !events ? (
          <p role="status">Загружаем афишу…</p>
        ) : (
          <>
            {!query.trim() && (
              <Featured
                key={JSON.stringify([genre, city])}
                events={[...featured.upcoming, ...featured.archive]}
                all={events}
                today={day}
              />
            )}
            <Calendar today={day} date={date} select={setDate} />
            <section id="af-agenda" className="af-agenda">
              <div className="af-head">
                <h2>
                  {query.trim()
                    ? 'Результаты поиска'
                    : date
                      ? 'Афиша · ' + calendarLabel(date, { day: 'numeric', month: 'long' })
                      : 'Ближайшие события'}
                </h2>
                <p className="af-muted" role="status">
                  {count ? 'Событий: ' + count : ''}
                </p>
              </div>
              <div className="af-cards" id="af-cards">
                {upcoming.map((e) => (
                  <ConcertCard key={e.id} event={e} />
                ))}
              </div>
              {!selected.length && (
                <p className="af-empty">
                  {date ? 'На эту дату событий не найдено.' : 'Событий по выбранным фильтрам нет.'}
                </p>
              )}
              {archive.length > 0 && (
                <div className="af-archive">
                  {!upcoming.length && !query.trim() && (
                    <p className="af-empty">Ближайших событий пока нет.</p>
                  )}
                  <h2>Архив</h2>
                  <div className="af-cards">
                    {archive.map((e) => (
                      <ConcertCard key={e.id} event={e} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <footer className="af-wrap af-footer">
        <b aria-label="Разнобой">Raznoboy</b>
        <span>Афиши и фотографии со страниц организаторов.</span>
      </footer>
      {events && <Outlet context={events} />}
    </div>
  );
}
