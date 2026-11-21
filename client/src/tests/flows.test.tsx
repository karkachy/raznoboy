// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { api, ApiError } from '../api';
import { SessionProvider } from '../auth/SessionContext';
import { RatingPanel } from '../components/RatingPanel';
import { CheckoutPage } from '../pages/CheckoutPage';
import { ProfilePage } from '../pages/ProfilePage';
import { paths } from '../routes/paths';
import type { Session } from '../types';
import { concert } from './fixtures';

const initial: Session = {
  user: { name: 'Аня' }, tickets: [],
  ratings: [{ eventId: concert.id, average: 4.8, count: 10, mine: null }],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function openRating(session: Session) {
  vi.spyOn(api, 'session').mockResolvedValue(session);
  render(<MemoryRouter><SessionProvider><RatingPanel eventId={concert.id} /></SessionProvider></MemoryRouter>);
}

it('показывает гостю публичный рейтинг, заполняет пятую звезду на 80% и предлагает войти', async () => {
  openRating({ ...initial, user: null });
  await screen.findByText('4,8 / 5');
  const stars = document.querySelectorAll<HTMLElement>('.af-rating-star');
  expect(Array.from(stars, (star) => star.style.getPropertyValue('--fill'))).toEqual([
    '100%', '100%', '100%', '100%', '80%',
  ]);
  expect(screen.queryByRole('radio')).toBeNull();
  const link = screen.getByRole('link', { name: 'Войти и оценить' }) as HTMLAnchorElement;
  expect(new URL(link.href).searchParams.get('next')).toBe('/events/witcher#rating');
});

it('отправляет выбранную оценку один раз, выводит новый средний балл и блокирует повтор той же оценки', async () => {
  const user = userEvent.setup();
  openRating(initial);
  const rate = vi.spyOn(api, 'rate').mockResolvedValue({
    ...initial, ratings: [{ eventId: concert.id, average: 4.5, count: 11, mine: 2 }],
  });
  const save = await screen.findByRole<HTMLButtonElement>('button', { name: 'Сохранить оценку' });
  expect(save.disabled).toBe(true);
  await user.click(screen.getByRole('radio', { name: '2 из 5' }));
  await user.click(save);
  await screen.findByText('Ваша оценка сохранена.');
  expect(rate).toHaveBeenCalledExactlyOnceWith(concert.id, 2);
  expect(screen.getByText('4,5 / 5')).toBeTruthy();
  expect(screen.getByText('Оценка зрителей · голосов: 11')).toBeTruthy();
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Изменить оценку' }).disabled).toBe(true);
});

it('после ошибки повторяет то же оформление и показывает номер билета и концерт в профиле', async () => {
  const user = userEvent.setup();
  const session = vi.spyOn(api, 'session').mockResolvedValue(initial);
  const buy = vi.spyOn(api, 'buy').mockRejectedValueOnce(new Error('Нет связи с сервером.')).mockImplementation(
    async (eventId, requestId) => {
      const ticket = { ...concert, number: 7, eventId, requestId };
      const purchased = { ...initial, tickets: [ticket] };
      session.mockResolvedValue(purchased);
      return purchased;
    },
  );
  render(
    <MemoryRouter initialEntries={[paths.checkout(concert.id)]}>
      <SessionProvider>
        <Routes>
          <Route element={<Outlet context={[concert]} />}>
            <Route path={paths.checkoutPattern} element={<CheckoutPage />} />
            <Route path={paths.profile} element={<ProfilePage />} />
          </Route>
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );

  const confirm = await screen.findByRole('button', { name: 'Подтвердить покупку' });
  await user.click(confirm);
  await screen.findByText('Нет связи с сервером.');
  await user.click(confirm);

  const profile = await screen.findByRole('dialog', { name: 'Профиль' });
  expect(buy).toHaveBeenCalledTimes(2);
  const [first, retry] = buy.mock.calls;
  expect(first).toEqual([concert.id, expect.stringMatching(/^[a-f0-9-]{36}$/i)]);
  expect(retry).toEqual(first);
  expect(within(profile).getByText('Билет № RZ-000007 оформлен.')).toBeTruthy();
  const row = within(profile).getByRole('listitem');
  expect(within(row).getByText(concert.title)).toBeTruthy();
  expect(within(row).getByText('Билет № RZ-000007')).toBeTruthy();
});

function openProfile(session: Session) {
  vi.spyOn(api, 'session').mockResolvedValue(session);
  render(
    <MemoryRouter initialEntries={[paths.profile]}>
      <SessionProvider>
        <ProfilePage />
      </SessionProvider>
    </MemoryRouter>,
  );
}

it('не отправляет пустое имя и сохраняет новое имя без лишних пробелов', async () => {
  const user = userEvent.setup();
  openProfile(initial);
  const rename = vi.spyOn(api, 'rename').mockResolvedValue({ ...initial, user: { name: 'Анна' } });
  await user.click(await screen.findByRole('button', { name: 'Изменить имя' }));
  const input = screen.getByRole('textbox', { name: 'Имя' });
  await user.clear(input);
  await user.click(screen.getByRole('button', { name: 'Сохранить' }));
  expect(screen.getByText('Введите имя.').id).toBe(input.getAttribute('aria-describedby'));
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(rename).not.toHaveBeenCalled();
  await user.type(input, '  Анна ');
  await user.click(screen.getByRole('button', { name: 'Сохранить' }));
  await screen.findByText('Анна');
  expect(rename).toHaveBeenCalledExactlyOnceWith('Анна');
  expect(screen.queryByRole('textbox')).toBeNull();
});

it('возвращает билет только после подтверждения и убирает его из списка', async () => {
  const user = userEvent.setup();
  const ticket = { ...concert, number: 12, eventId: concert.id, requestId: crypto.randomUUID() };
  openProfile({ ...initial, tickets: [ticket] });
  const refund = vi.spyOn(api, 'returnTicket').mockResolvedValue(initial);
  await user.click(await screen.findByRole('button', { name: 'Вернуть билет' }));
  await user.click(screen.getByRole('button', { name: 'Нет' }));
  expect(refund).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Вернуть билет' }));
  await user.click(screen.getByRole('button', { name: 'Да, вернуть' }));
  await screen.findByText('Билет № RZ-000012 возвращён.');
  expect(refund).toHaveBeenCalledExactlyOnceWith(12);
  expect(screen.queryByRole('listitem')).toBeNull();
  expect(screen.getByText('Здесь появятся билеты после покупки.')).toBeTruthy();
});

it('показывает ошибку сервера и оставляет билет, если вернуть не удалось', async () => {
  const user = userEvent.setup();
  const ticket = { ...concert, number: 3, eventId: concert.id, requestId: crypto.randomUUID() };
  openProfile({ ...initial, tickets: [ticket] });
  vi.spyOn(api, 'returnTicket').mockRejectedValue(new ApiError(409, 'Билет на прошедший концерт не возвращается.'));
  await user.click(await screen.findByRole('button', { name: 'Вернуть билет' }));
  await user.click(screen.getByRole('button', { name: 'Да, вернуть' }));
  await screen.findByText('Билет на прошедший концерт не возвращается.');
  expect(screen.getByRole('listitem')).toBeTruthy();
});

it('удаляет свою оценку и снова предлагает её поставить', async () => {
  const user = userEvent.setup();
  openRating({ ...initial, ratings: [{ eventId: concert.id, average: 4.5, count: 11, mine: 2 }] });
  const unrate = vi.spyOn(api, 'unrate').mockResolvedValue(initial);
  await user.click(await screen.findByRole('button', { name: 'Удалить оценку' }));
  await screen.findByText('Оценка удалена.');
  expect(unrate).toHaveBeenCalledExactlyOnceWith(concert.id);
  expect(screen.getByText('4,8 / 5')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Удалить оценку' })).toBeNull();
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Сохранить оценку' }).disabled).toBe(true);
});
