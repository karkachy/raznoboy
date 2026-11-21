import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './auth/SessionContext';
import { AppRoutes } from './routes/AppRoutes';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <SessionProvider>
      <AppRoutes />
    </SessionProvider>
  </BrowserRouter>,
);
