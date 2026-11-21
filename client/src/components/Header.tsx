import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import { paths, signInFor } from '../routes/paths';

interface Props {
  query: string;
  city: string;
  cities: string[];
  onQuery: (s: string) => void;
  onCity: (s: string) => void;
}
export function Header({ query, city, cities, onQuery, onCity }: Props) {
  const { session } = useSession();
  const user = session?.user;
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current!;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    function playback() {
      if (motion.matches || document.hidden || !visible) {
        video.pause();
        return;
      }
      if (!video.hasAttribute('src')) video.src = '/art/header-lava.webm';
      void video.play().catch(() => {});
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      playback();
    });
    observer.observe(video.closest('header')!);
    document.addEventListener('visibilitychange', playback);
    motion.addEventListener('change', playback);
    playback();
    return () => {
      observer.disconnect();
      video.pause();
      document.removeEventListener('visibilitychange', playback);
      motion.removeEventListener('change', playback);
    };
  }, []);
  return (
    <header className="af-header">
      <video
        className="af-lava"
        ref={videoRef}
        aria-hidden="true"
        muted
        loop
        playsInline
        preload="none"
        poster="/art/header-lava-poster.jpg"
      />
      <div className="af-wrap af-top">
        <Link to={paths.home} className="af-brand" aria-label="Разнобой">
          Raznoboy
        </Link>
        <label className="af-search">
          <span className="af-sr">Поиск событий</span>
          <input
            type="search"
            value={query}
            placeholder="Событие, артист или площадка"
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                document.getElementById('af-agenda')?.scrollIntoView({ block: 'nearest' });
            }}
          />
          <span className="af-search-prompt" aria-hidden="true">
            <span className="af-glass" />
            <span>Событие, артист или площадка</span>
          </span>
        </label>
        <div className="af-actions af-header-actions">
          <label className="af-city">
            <span className="af-pin" aria-hidden="true" />
            <span className="af-sr">Город</span>
            <select value={city} onChange={(e) => onCity(e.target.value)}>
              <option value="">Все города</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Link
            className={'af-icon af-account' + (user ? ' af-signed' : '')}
            to={session && !user ? signInFor(paths.profile) : paths.profile}
            aria-label={user ? 'Профиль пользователя ' + user.name : 'Войти'}
          >
            {user ? Array.from(user.name)[0]?.toLocaleUpperCase('ru') : <span className="af-door" />}
          </Link>
        </div>
      </div>
    </header>
  );
}
