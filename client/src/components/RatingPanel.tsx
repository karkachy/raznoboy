import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { paths, signInFor } from '../routes/paths';
import { api, ApiError, errorText } from '../api';
import { useSession } from '../auth/SessionContext';
import { formatRating } from '../utils/concerts';

export function RatingPanel({ eventId }: { eventId: string }) {
  const { session, update, refresh } = useSession();
  const navigate = useNavigate();
  const rating = session?.ratings.find((r) => r.eventId === eventId);
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const selected = choice ?? rating?.mine;
  const login = signInFor(paths.event(eventId) + '#rating');
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    try {
      update(await api.rate(eventId, selected));
      setMessage('Ваша оценка сохранена.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await refresh();
        navigate(login, { replace: true });
      } else setMessage(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      update(await api.unrate(eventId));
      setChoice(null);
      setMessage('Оценка удалена.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await refresh();
        navigate(login, { replace: true });
      } else setMessage(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="rating">
      {rating && (
        <div className="af-rating">
          <span className="af-rating-label">Оценка зрителей · голосов: {rating.count}</span>
          <span className="af-stars" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                className="af-rating-star"
                key={i}
                style={
                  {
                    '--fill': Math.round(Math.min(1, Math.max(0, rating.average - i)) * 100) + '%',
                  } as CSSProperties
                }
              />
            ))}
          </span>
          <b>{formatRating(rating.average)} / 5</b>
        </div>
      )}
      {session?.user ? (
        <form className="af-vote" onSubmit={submit}>
          <fieldset disabled={busy}>
            <legend>Ваша оценка</legend>
            <div className="af-vote-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={n <= (selected ?? 0) ? 'af-filled' : ''}>
                  <input
                    type="radio"
                    name="score"
                    value={n}
                    checked={selected === n}
                    aria-label={n + ' из 5'}
                    onChange={() => {
                      setChoice(n);
                      setMessage('');
                    }}
                  />
                  <span />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="af-event-actions">
            <button className="af-text-button" disabled={busy || !selected || selected === rating?.mine}>
              {busy ? 'Сохраняем…' : rating?.mine ? 'Изменить оценку' : 'Сохранить оценку'}
            </button>
            {rating?.mine && (
              <button type="button" className="af-text-button" disabled={busy} onClick={remove}>
                Удалить оценку
              </button>
            )}
          </div>
          <p className="af-form-message" role="status">
            {message}
          </p>
        </form>
      ) : (
        <Link className="af-text-button" to={login}>
          Войти и оценить
        </Link>
      )}
    </section>
  );
}
