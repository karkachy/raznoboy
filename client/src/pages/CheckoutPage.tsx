import { useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api, ApiError, errorText } from '../api';
import { useSession } from '../auth/SessionContext';
import { PageDialog } from '../components/PageDialog';
import { paths, signInFor } from '../routes/paths';
import type { Concert } from '../types';
import { dateLabel, today } from '../utils/concerts';

export function CheckoutPage() {
  const concerts = useOutletContext<Concert[]>();
  const { eventId } = useParams();
  const event = concerts.find((e) => e.id === eventId);
  return event && event.date >= today() ? (
    <OrderForm key={event.id} event={event} />
  ) : (
    <PageDialog title="Оформление недоступно">
      <Link to="/">Вернуться к афише</Link>
    </PageDialog>
  );
}
function OrderForm({ event }: { event: Concert }) {
  const { update, refresh } = useSession();
  const navigate = useNavigate();
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.buy(event.id, requestId);
      update(result);
      const ticket = result.tickets.find((t) => t.requestId === requestId && t.eventId === event.id);
      navigate(paths.profile, { replace: true, state: { issued: ticket?.number } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await refresh();
        navigate(signInFor(paths.checkout(event.id)), { replace: true });
      } else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageDialog title="Оформление билета">
      <h3>{event.title}</h3>
      <p className="af-muted">{[dateLabel(event), event.time].filter(Boolean).join(' · ')}</p>
      <p className="af-muted">
        {event.city} · {event.place}
      </p>
      <p>1 билет · Демонстрационное оформление без оплаты.</p>
      <div className="af-event-actions">
        <button className="af-ticket-link" onClick={confirm} disabled={busy}>
          {busy ? 'Оформляем…' : 'Подтвердить покупку'}
        </button>
        <Link to={paths.event(event.id)} className="af-text-button">
          К афише концерта
        </Link>
      </div>
      <p role="status" className="af-form-message">
        {error}
      </p>
    </PageDialog>
  );
}
