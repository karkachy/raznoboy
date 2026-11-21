import { Link } from 'react-router-dom';
import { Poster } from './Poster';
import { paths } from '../routes/paths';
import type { Concert } from '../types';
import { dateLabel } from '../utils/concerts';

export function ConcertCard({ event }: { event: Concert }) {
  return (
    <article className="af-card">
      <Link className="af-poster" to={paths.event(event.id)} aria-label={'Подробнее о ' + event.title}>
        <Poster event={event} lazy />
      </Link>
      <div className="af-card-copy">
        <p className="af-kicker">{event.kind}</p>
        <h3>{event.title}</h3>
        <p className="af-muted">{[dateLabel(event), event.time, event.city].filter(Boolean).join(' · ')}</p>
        <p className="af-muted">{event.place}</p>
      </div>
    </article>
  );
}
