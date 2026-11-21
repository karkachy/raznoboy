import { Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import type { ReactNode } from 'react';
import { paths, signInFor } from './paths';
import { useSession } from '../auth/SessionContext';
import { PageDialog } from '../components/PageDialog';
import { AfishaPage } from '../pages/AfishaPage';
import { ConcertPage } from '../pages/ConcertPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { AuthPage } from '../pages/AuthPage';
import { ProfilePage } from '../pages/ProfilePage';

function Protected({ children }: { children: ReactNode }) {
  const { session, error, refresh } = useSession();
  const location: Location = useLocation();
  if (error && !session)
    return (
      <PageDialog title="Аккаунт">
        <p role="alert">{error}</p>
        <button className="af-text-button" onClick={() => void refresh()}>
          Повторить
        </button>
      </PageDialog>
    );
  if (!session)
    return (
      <PageDialog title="Аккаунт">
        <p role="status">Загружаем…</p>
      </PageDialog>
    );
  return session.user ? children : <Navigate replace to={signInFor(location.pathname + location.hash)} />;
}
function HomeLink() {
  const query = new URLSearchParams(useLocation().search);
  const buy = query.get('buy'),
    concert = query.get('concert');
  if (buy) return <Navigate to={paths.checkout(buy)} replace />;
  if (concert) return <Navigate to={paths.event(concert)} replace />;
  return null;
}
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AfishaPage />}>
        <Route index element={<HomeLink />} />
        <Route path={paths.eventPattern} element={<ConcertPage />} />
        <Route
          path={paths.checkoutPattern}
          element={
            <Protected>
              <CheckoutPage />
            </Protected>
          }
        />
        <Route
          path={paths.profile}
          element={
            <Protected>
              <ProfilePage />
            </Protected>
          }
        />
        <Route path={paths.login} element={<AuthPage key="login" />} />
        <Route path={paths.register} element={<AuthPage key="register" register />} />
        <Route
          path="*"
          element={
            <PageDialog title="Страница не найдена">
              <a href="/">К афише</a>
            </PageDialog>
          }
        />
      </Route>
    </Routes>
  );
}
