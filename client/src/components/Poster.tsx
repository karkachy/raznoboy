import type { Concert } from '../types';

export function Poster({
  event,
  className = '',
  lazy = false,
}: {
  event: Concert;
  className?: string;
  lazy?: boolean;
}) {
  return (
    <img
      src={event.cover}
      alt=""
      decoding="async"
      loading={lazy ? 'lazy' : 'eager'}
      className={className + (event.coverPosition ? ' af-photo' : '')}
      style={event.coverPosition ? { objectPosition: event.coverPosition } : undefined}
    />
  );
}
