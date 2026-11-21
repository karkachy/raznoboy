import type { Concert, Credentials, Session } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Сервер работает отдельно, на своём порту. Адрес можно переопределить переменной VITE_API_URL.
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5198/api';

async function request<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['X-Afisha-Request'] = '1';
    headers['Content-Type'] = 'application/json';
  }
  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      // Cookie сессии отправляется и на другой порт.
      credentials: 'include',
      body: JSON.stringify(body),
    });
  } catch {
    // fetch падает только без ответа сервера: нет сети или сервер не запущен.
    throw new Error('Нет связи с сервером. Попробуйте ещё раз.');
  }
  // Ответ может оказаться не JSON (например, HTML-страница прокси при 502).
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = serverMessage(data);
    throw new ApiError(response.status, message || 'Не удалось выполнить запрос (код ' + response.status + ').');
  }
  if (data === null) throw new ApiError(response.status, 'Сервер прислал непонятный ответ.');
  return data as T;
}
// Текст ошибки, который сервер кладёт в поле error.
function serverMessage(data: unknown) {
  return typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
    ? data.error
    : '';
}
export const api = {
  events: () => request<Concert[]>('/events'),
  session: () => request<Session>('/session'),
  login: (fields: Credentials) => request<Session>('/login', 'POST', fields),
  register: (fields: Credentials) => request<Session>('/accounts', 'POST', fields),
  logout: () => request<Session>('/logout', 'POST', {}),
  rate: (id: string, score: number) =>
    request<Session>('/ratings/' + encodeURIComponent(id), 'PUT', { score }),
  buy: (id: string, requestId: string) =>
    request<Session>('/tickets/' + encodeURIComponent(id), 'POST', { requestId }),
  rename: (name: string) => request<Session>('/account', 'PATCH', { name }),
  returnTicket: (number: number) => request<Session>('/tickets/' + number, 'DELETE'),
  unrate: (id: string) => request<Session>('/ratings/' + encodeURIComponent(id), 'DELETE'),
};
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Ошибка запроса.';
}
