export const paths = {
  home: '/',
  profile: '/profile',
  login: '/login',
  register: '/register',
  eventPattern: '/events/:eventId',
  checkoutPattern: '/events/:eventId/checkout',
  event: (id: string) => '/events/' + encodeURIComponent(id),
  checkout: (id: string) => '/events/' + encodeURIComponent(id) + '/checkout',
};
export const signInFor = (target: string) => paths.login + '?next=' + encodeURIComponent(target);
export function returnPath(search: string) {
  const next = new URLSearchParams(search).get('next');
  return next && (/^\/events\/[a-z0-9-]+(?:\/checkout|#rating)?$/.test(next) || next === paths.profile)
    ? next
    : paths.profile;
}
