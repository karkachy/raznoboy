import { useEffect } from 'react';
import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { paths } from '../routes/paths';
import type { Concert } from '../types';
import { dateLabel, today } from '../utils/concerts';
import { PageDialog } from '../components/PageDialog';
import { RatingPanel } from '../components/RatingPanel';
import { Poster } from '../components/Poster';

export function ConcertPage() {
  const events = useOutletContext<Concert[]>();
  const { eventId } = useParams();
  const { hash } = useLocation();
  const event = events.find((e) => e.id === eventId);
  useEffect(() => {
    if (hash === '#rating') {
      const frame = requestAnimationFrame(() =>
        document.getElementById('rating')?.scrollIntoView({ block: 'center' }),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [eventId, hash]);
  if (!event)
    return (
      <PageDialog title="Концерт не найден">
        <Link to="/">Вернуться к афише</Link>
      </PageDialog>
    );
  const archive = event.date < today();
  return (
    <PageDialog title={event.title}>
      <Poster event={event} className="af-event-image" />
      <p className="af-credit">Источник изображения — {event.credit}</p>
      <p className="af-kicker">
        {event.kind}
        {archive ? ' · Архив' : ''}
      </p>
      <p className="af-muted">
        {[dateLabel(event), event.time, event.city, event.place].filter(Boolean).join(' · ')}
      </p>
      <p>{event.desc}</p>
      <RatingPanel key={event.id} eventId={event.id} />
      <div className="af-event-actions">
        {!archive && (
          <Link className="af-ticket-link" to={paths.checkout(event.id)}>
            Купить билет
          </Link>
        )}
        <a
          className="af-source-link"
          href={new URL((!archive && event.ticketUrl) || event.source, event.source).href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {archive ? 'Страница события' : 'У организатора'}
        </a>
      </div>
    </PageDialog>
  );
}
