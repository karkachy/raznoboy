import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import { paths } from '../routes/paths';
import type { Concert } from '../types';
import { dateLabel, formatRating } from '../utils/concerts';
import { Poster } from './Poster';

export function Featured({ events, all, today }: { events: Concert[]; all: Concert[]; today: string }) {
  const [position, setPosition] = useState(0);
  const { session } = useSession();
  if (!events.length) return null;
  const index = position % events.length;
  const current = events[index];
  const following = [...events.slice(index + 1), ...events.slice(0, index)];
  const other = following.filter((event) => event.genre !== current.genre);
  const first = other[0] || following[0];
  const second =
    other.find((event) => event.genre !== first?.genre) || following.find((event) => event !== first);
  return (
    <section id="af-hits">
      <div className="af-head af-feature-head">
        <h1>На слуху</h1>
        <div className="af-actions">
          {[-1, 1].map((direction) => (
            <button
              key={direction}
              className="af-icon"
              disabled={events.length < 2}
              aria-label={direction < 0 ? 'Предыдущее событие' : 'Следующее событие'}
              onClick={() => setPosition((index + events.length + direction) % events.length)}
            >
              {direction < 0 ? '‹' : '›'}
            </button>
          ))}
        </div>
      </div>
      <article id="af-feature" aria-live="polite">
        <div id="af-spot-captions">
          {all.map((event) => {
            const rating = session?.ratings.find((r) => r.eventId === event.id);
            return (
              <div className="af-spot-copy" key={event.id} inert={event.id !== current.id}>
                <div className="af-spot-info">
                  <p className="af-kicker">
                    {event.kind}
                    {event.date < today ? ' · Архив' : ''}
                  </p>
                  <div className="af-rated-heading">
                    <h2 className="af-event-title">
                      <span>{event.title}</span>
                    </h2>
                    {rating && (
                      <Link
                        className="af-rating-badge"
                        to={paths.event(event.id) + '#rating'}
                        aria-label={'Оценка зрителей ' + formatRating(rating.average) + ' из 5'}
                      >
                        {formatRating(rating.average)}
                      </Link>
                    )}
                  </div>
                  <p className="af-spot-date">{[dateLabel(event), event.time].filter(Boolean).join(' · ')}</p>
                  <p className="af-muted">
                    {event.city} · {event.place}
                  </p>
                </div>
                <Link className="af-cta" to={paths.event(event.id)}>
                  Подробнее
                </Link>
              </div>
            );
          })}
        </div>
        <div id="af-spot-cover">
          <Link
            className="af-spot-art"
            to={paths.event(current.id)}
            aria-label={'Подробнее о ' + current.title}
          >
            <Poster event={current} />
          </Link>
        </div>
      </article>
      {first && (
        <div className="af-picks">
          {[first, second]
            .filter((e): e is Concert => Boolean(e))
            .map((event) => (
              <button key={event.id} className="af-pick" onClick={() => setPosition(events.indexOf(event))}>
                <Poster event={event} />
                <span className="af-pick-label">
                  <strong>{event.title}</strong>
                  <small>
                    {dateLabel(event)} · {event.city}
                  </small>
                </span>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
