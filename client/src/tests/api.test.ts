import { afterEach, expect, it, vi } from 'vitest';
import { api, API_URL, ApiError } from '../api';

afterEach(() => vi.unstubAllGlobals());

it('передаёт один POST с идентификатором оформления и cookie на адрес сервера', async () => {
  const snapshot = { user: { name: 'Аня' }, tickets: [], ratings: [] };
  const fetch = vi.fn().mockResolvedValue(Response.json(snapshot));
  vi.stubGlobal('fetch', fetch);
  const requestId = crypto.randomUUID();
  expect(await api.buy('witcher', requestId)).toEqual(snapshot);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('http://localhost:5198/api/tickets/witcher', expect.objectContaining({
    method: 'POST', credentials: 'include', body: JSON.stringify({ requestId }),
    headers: expect.objectContaining({ 'X-Afisha-Request': '1', 'Content-Type': 'application/json' }),
  }));
});

it('сохраняет статус и сообщение сервера при отказе во входе', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Неверная почта или пароль.' }, { status: 401 })));
  const login = api.login({ email: 'anna@example.org', password: 'incorrect' });
  await expect(login).rejects.toBeInstanceOf(ApiError);
  await expect(login).rejects.toMatchObject({ status: 401, message: 'Неверная почта или пароль.' });
});

it('возвращает понятное сообщение при потере связи с сервером', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(api.session()).rejects.toThrow('Нет связи с сервером');
});

it('возврат билета и удаление оценки отправляют DELETE без тела, имя — PATCH', async () => {
  const snapshot = { user: { name: 'Аня' }, tickets: [], ratings: [] };
  const fetch = vi.fn().mockImplementation(async () => Response.json(snapshot));
  vi.stubGlobal('fetch', fetch);
  await api.returnTicket(42);
  await api.unrate('nier');
  await api.rename('Анна');
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch.mock.calls[0]).toEqual([API_URL + '/tickets/42', expect.objectContaining({ method: 'DELETE', body: undefined })]);
  expect(fetch.mock.calls[1]).toEqual([API_URL + '/ratings/nier', expect.objectContaining({ method: 'DELETE' })]);
  expect(fetch.mock.calls[2]).toEqual([API_URL + '/account', expect.objectContaining({
    method: 'PATCH', body: JSON.stringify({ name: 'Анна' }),
    headers: expect.objectContaining({ 'X-Afisha-Request': '1' }),
  })]);
});

it('показывает код ответа, если сервер прислал не JSON или ошибку без текста', async () => {
  const html = () => new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } });
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => html()));
  await expect(api.events()).rejects.toMatchObject({ status: 502, message: 'Не удалось выполнить запрос (код 502).' });

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, { status: 400 })));
  await expect(api.events()).rejects.toMatchObject({ status: 400, message: 'Не удалось выполнить запрос (код 400).' });

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })));
  await expect(api.events()).rejects.toMatchObject({ status: 200, message: 'Сервер прислал непонятный ответ.' });
});
