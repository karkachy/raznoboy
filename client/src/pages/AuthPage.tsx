import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, errorText } from '../api';
import { useSession } from '../auth/SessionContext';
import { PageDialog } from '../components/PageDialog';
import { paths, returnPath } from '../routes/paths';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { session, update } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const next = returnPath(location.search);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (session?.user) return <Navigate to={next} replace />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const fields = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    };
    setBusy(true);
    setError('');
    try {
      update(await (register ? api.register(fields) : api.login(fields)));
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageDialog title={register ? 'Регистрация' : 'Вход'}>
      <form className="af-profile-form" onSubmit={submit}>
        {register && (
          <label>
            Имя
            <input name="name" required maxLength={30} autoComplete="given-name" />
          </label>
        )}
        <label>
          Электронная почта
          <input name="email" type="email" required maxLength={254} autoComplete="email" />
        </label>
        <label>
          Пароль
          <input
            name="password"
            type="password"
            required
            minLength={register ? 8 : undefined}
            maxLength={128}
            autoComplete={register ? 'new-password' : 'current-password'}
            placeholder={register ? 'От 8 символов' : undefined}
          />
        </label>
        <p className="af-form-message" role="alert">
          {error}
        </p>
        <button className="af-ticket-link" disabled={busy}>
          {busy ? 'Отправляем…' : register ? 'Создать аккаунт' : 'Войти'}
        </button>
        <Link
          className="af-text-button"
          to={(register ? paths.login : paths.register) + location.search}
          replace
        >
          {register ? 'Уже есть аккаунт' : 'Создать аккаунт'}
        </Link>
      </form>
    </PageDialog>
  );
}
