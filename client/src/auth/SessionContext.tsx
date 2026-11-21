import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, errorText } from '../api';
import type { Session } from '../types';

interface SessionState {
  session: Session | null;
  error: string;
  refresh: () => Promise<void>;
  update: (next: Session) => void;
}
const Context = createContext<SessionState | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const version = useRef(0);
  const update = useCallback((next: Session) => {
    version.current++;
    setSession(next);
    setError('');
  }, []);
  const refresh = useCallback(async () => {
    const revision = ++version.current;
    setError('');
    try {
      const next = await api.session();
      if (revision === version.current) setSession(next);
    } catch (err) {
      if (revision === version.current) setError(errorText(err));
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return <Context.Provider value={{ session, error, refresh, update }}>{children}</Context.Provider>;
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('SessionProvider is missing');
  return value;
}
