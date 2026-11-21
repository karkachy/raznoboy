import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import { api, ApiError, errorText } from '../api';
import { paths } from '../routes/paths';
import { PageDialog } from '../components/PageDialog';
import { dateLabel, today } from '../utils/concerts';
import type { Ticket } from '../types';

const ticketNumber = (n: number) => 'RZ-' + String(n).padStart(6, '0');
export function ProfilePage() {
  const { session, update, refresh } = useSession();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function logout() {
    setBusy(true);
    try {
      update(await api.logout());
      navigate(paths.home, { replace: true });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }
  if (!session?.user) return null;
  const issued = !notice && session.tickets.some((t) => t.number === state?.issued);
  return (
    <PageDialog title="Профиль">
      <NameEditor key={session.user.name} name={session.user.name} />
      {issued && <p role="status">Билет № {ticketNumber(state.issued)} оформлен.</p>}
      <p role="status" className="af-form-message">
        {notice}
      </p>
      <section className="af-profile-tickets">
        <h3>Мои билеты</h3>
        {session.tickets.length ? (
          <ul>
            {session.tickets.map((ticket) => (
              <TicketRow
                key={ticket.number}
                ticket={ticket}
                onReturned={() => setNotice('Билет № ' + ticketNumber(ticket.number) + ' возвращён.')}
              />
            ))}
          </ul>
        ) : (
          <p className="af-muted">Здесь появятся билеты после покупки.</p>
        )}
      </section>
      <button className="af-text-button" onClick={logout} disabled={busy}>
        Выйти
      </button>
      <p role="alert">{error}</p>
    </PageDialog>
  );
}

// Редактирование имени: проверка на клиенте, затем PATCH /api/account.
function NameEditor({ name }: { name: string }) {
  const { update, refresh } = useSession();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const trimmed = value.trim();
    if (!trimmed) return setError('Введите имя.');
    if (trimmed.length > 30) return setError('Имя не длиннее 30 символов.');
    if (trimmed === name) return setEditing(false);
    setBusy(true);
    setError('');
    try {
      update(await api.rename(trimmed));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) await refresh();
      else setError(errorText(err));
      setBusy(false);
    }
  }
  if (!editing)
    return (
      <div className="af-profile-name">
        <p>{name}</p>
        <button className="af-text-button" onClick={() => setEditing(true)}>
          Изменить имя
        </button>
      </div>
    );
  return (
    <form className="af-profile-form" onSubmit={save} noValidate>
      <label>
        Имя
        <input
          name="name"
          value={value}
          maxLength={30}
          autoComplete="given-name"
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby="af-name-error"
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
        />
      </label>
      <p id="af-name-error" className="af-form-message" role="alert">
        {error}
      </p>
      <div className="af-event-actions">
        <button className="af-ticket-link" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <button
          type="button"
          className="af-text-button"
          disabled={busy}
          onClick={() => {
            setValue(name);
            setError('');
            setEditing(false);
          }}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

// Возврат билета с подтверждением: DELETE /api/tickets/:number.
function TicketRow({ ticket, onReturned }: { ticket: Ticket; onReturned: () => void }) {
  const { update, refresh } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refundable = ticket.date >= today();
  async function confirmReturn() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const next = await api.returnTicket(ticket.number);
      onReturned();
      update(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) await refresh();
      else setError(errorText(err));
      setBusy(false);
    }
  }
  return (
    <li className="af-profile-ticket">
      <small className="af-kicker">Билет № {ticketNumber(ticket.number)}</small>
      <h4>{ticket.title}</h4>
      <p className="af-muted">{[dateLabel(ticket), ticket.time].filter(Boolean).join(' · ')}</p>
      <p className="af-muted">
        {ticket.city} · {ticket.place}
      </p>
      {refundable &&
        (confirming ? (
          <div className="af-event-actions af-confirm" role="group" aria-label="Подтверждение возврата">
            <span>Вернуть билет?</span>
            <button className="af-text-button" onClick={confirmReturn} disabled={busy}>
              {busy ? 'Возвращаем…' : 'Да, вернуть'}
            </button>
            <button className="af-text-button" onClick={() => setConfirming(false)} disabled={busy}>
              Нет
            </button>
          </div>
        ) : (
          <button className="af-text-button" onClick={() => setConfirming(true)}>
            Вернуть билет
          </button>
        ))}
      <p className="af-form-message" role="alert">
        {error}
      </p>
    </li>
  );
}
