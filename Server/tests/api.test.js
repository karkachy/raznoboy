import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tempRoot = path.resolve(tmpdir());
let directory, db, server, baseUrl;

before(async () => {
  directory = mkdtempSync(path.join(tempRoot, 'raznoboy-test-'));
  process.env.AFISHA_DATA_DIR = directory;
  // Импорт открывает SQLite, поэтому каталог задаётся заранее.
  ({ db } = await import('../db/connection.js'));
  const { app } = await import('../app.js');
  const setDate = db.prepare('UPDATE EventDetails SET date=? WHERE Id=?');
  assert.equal(setDate.run('2999-11-20', 'witcher').changes, 1);
  assert.equal(setDate.run('2000-05-13', 'skrillex').changes, 1);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = 'http://127.0.0.1:' + server.address().port + '/api';
});

after(async () => {
  if (server?.listening) await new Promise((done) => server.close(done));
  db?.close();
  if (directory && path.dirname(path.resolve(directory)) === tempRoot && path.basename(directory).startsWith('raznoboy-test-'))
    rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
});

async function request(method, route, { body, cookie, status = 200 } = {}) {
  const headers = { 'X-Afisha-Request': '1' };
  if (cookie) headers.Cookie = cookie;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(baseUrl + route, { method, headers, body: JSON.stringify(body) });
  const data = await res.json();
  assert.equal(res.status, status, method + ' ' + route + ' — ' + JSON.stringify(data.error));
  const sessionCookie = res.headers.getSetCookie().map((value) => value.split(';')[0])
    .find((value) => /^Raznoboy\.NodeSession=.+/.test(value));
  return { data, cookie: sessionCookie };
}

function credentials(tag) {
  return { name: 'Аня', email: tag + '@example.org', password: 'test-password-24' };
}

async function register(tag) {
  const result = await request('POST', '/accounts', { body: credentials(tag), status: 201 });
  assert.ok(result.cookie);
  return result.cookie;
}

test('регистрация открывает сессию, повтор почты отклоняется, после выхода нужен верный пароль', async () => {
  const body = credentials('login');
  const cookie = await register('login');
  const current = await request('GET', '/session', { cookie });
  assert.deepEqual(current.data.user, { name: body.name });
  await request('POST', '/accounts', { body: { ...body, email: body.email.toUpperCase() }, status: 409 });
  await request('POST', '/logout', { cookie });
  assert.equal((await request('GET', '/session', { cookie })).data.user, null);
  await request('POST', '/login', { body: { ...body, password: 'wrong-password' }, status: 401 });
  const login = await request('POST', '/login', { body });
  assert.ok(login.cookie);
  assert.deepEqual((await request('GET', '/session', { cookie: login.cookie })).data.user, { name: body.name });
});

test('гость может читать каталог, для покупки и оценки требуется вход', async () => {
  const { data } = await request('GET', '/events');
  assert.ok(data.some((event) => event.id === 'witcher' && event.title === 'The Witcher in Concert'));
  await request('POST', '/tickets/witcher', { body: { requestId: randomUUID() }, status: 401 });
  await request('PUT', '/ratings/witcher', { body: { score: 5 }, status: 401 });
});

test('повтор подтверждения сохраняет номер, отдельная покупка выдаёт второй билет, другой аккаунт их не видит', async () => {
  const cookie = await register('buyer');
  const requestId = randomUUID();
  const purchase = (key) => request('POST', '/tickets/witcher', { body: { requestId: key }, cookie });
  const [first, retry] = await Promise.all([purchase(requestId), purchase(requestId)]);
  assert.equal(first.data.tickets.length, 1);
  assert.deepEqual(retry.data.tickets, first.data.tickets);
  const ticket = first.data.tickets[0];
  assert.ok(ticket.number > 0);
  assert.equal(ticket.title, 'The Witcher in Concert');
  assert.equal(ticket.requestId, requestId);

  const second = await purchase(randomUUID());
  assert.equal(second.data.tickets.length, 2);
  assert.equal(new Set(second.data.tickets.map((item) => item.number)).size, 2);
  await request('POST', '/logout', { cookie });
  const login = await request('POST', '/login', { body: credentials('buyer') });
  assert.deepEqual((await request('GET', '/session', { cookie: login.cookie })).data.tickets, second.data.tickets);
  const other = await register('other-buyer');
  assert.deepEqual((await request('GET', '/session', { cookie: other })).data.tickets, []);
});

test('для архивного, неизвестного концерта и некорректного ключа билет не создаётся', async () => {
  const cookie = await register('archive');
  const body = { requestId: randomUUID() };
  await request('POST', '/tickets/skrillex', { cookie, body, status: 409 });
  await request('POST', '/tickets/missing-event', { cookie, body, status: 404 });
  await request('POST', '/tickets/witcher', { cookie, body: { requestId: 'не UUID' }, status: 400 });
  assert.deepEqual((await request('GET', '/session', { cookie })).data.tickets, []);
});

test('голос дополняет десять исходных, изменение заменяет голос, ошибочные оценки не меняют рейтинг', async () => {
  const cookie = await register('voter');
  const rating = (result) => result.data.ratings.find((item) => item.eventId === 'witcher');
  const vote = (score, status = 200) => request('PUT', '/ratings/witcher', { cookie, body: { score }, status });
  const initial = { eventId: 'witcher', count: 10, average: 4.8, mine: null };
  assert.deepEqual(rating(await request('GET', '/session', { cookie })), initial);
  assert.deepEqual(rating(await vote(2)), { ...initial, count: 11, average: 4.5, mine: 2 });
  const changed = { ...initial, count: 11, average: 4.8, mine: 5 };
  assert.deepEqual(rating(await vote(5)), changed);
  for (const invalid of [0, 6, 2.5]) await vote(invalid, 400);
  assert.deepEqual(rating(await request('GET', '/session', { cookie })), changed);
  assert.deepEqual(rating(await request('GET', '/session')), { ...changed, mine: null });
});

test('имя меняется только у вошедшего пользователя и проходит проверку длины', async () => {
  await request('PATCH', '/account', { body: { name: 'Гость' }, status: 401 });
  const cookie = await register('rename');
  for (const name of ['   ', 'x'.repeat(31), 42]) await request('PATCH', '/account', { cookie, body: { name }, status: 400 });
  const { data } = await request('PATCH', '/account', { cookie, body: { name: '  Анна Мария  ' } });
  assert.deepEqual(data.user, { name: 'Анна Мария' });
  assert.deepEqual((await request('GET', '/session', { cookie })).data.user, { name: 'Анна Мария' });
});

test('билет возвращает только владелец и только до даты концерта', async () => {
  const cookie = await register('refund');
  const bought = await request('POST', '/tickets/witcher', { cookie, body: { requestId: randomUUID() } });
  const number = bought.data.tickets[0].number;
  const stranger = await register('refund-stranger');
  await request('DELETE', '/tickets/' + number, { status: 401 });
  await request('DELETE', '/tickets/' + number, { cookie: stranger, status: 404 });
  await request('DELETE', '/tickets/abc', { cookie, status: 400 });
  const { data } = await request('DELETE', '/tickets/' + number, { cookie });
  assert.deepEqual(data.tickets, []);
  await request('DELETE', '/tickets/' + number, { cookie, status: 404 });

  const { Id: accountId } = db.prepare('SELECT Id FROM Accounts WHERE Email=?').get('refund@example.org');
  const archived = db.prepare(`INSERT INTO Tickets (AccountId,ConcertId,RequestId,Title,EventDate,City,Place)
    VALUES (?,?,?,?,?,?,?) RETURNING Number`).get(accountId, 'skrillex', randomUUID(), 'Skrillex', '2000-05-13', 'Моррисон', 'Red Rocks');
  await request('DELETE', '/tickets/' + archived.Number, { cookie, status: 409 });
  assert.equal((await request('GET', '/session', { cookie })).data.tickets.length, 1);
});

test('удаление оценки возвращает рейтинг к исходным голосам', async () => {
  const cookie = await register('unvote');
  const rating = (result) => result.data.ratings.find((item) => item.eventId === 'nier');
  const before = rating(await request('GET', '/session', { cookie }));
  await request('PUT', '/ratings/nier', { cookie, body: { score: 1 } });
  await request('DELETE', '/ratings/nier', { status: 401 });
  await request('DELETE', '/ratings/missing-event', { cookie, status: 404 });
  assert.deepEqual(rating(await request('DELETE', '/ratings/nier', { cookie })), before);
  assert.deepEqual(rating(await request('DELETE', '/ratings/nier', { cookie })), before);
});

test('каждый запрос к API записывается в лог-файл', async () => {
  const { logFile } = await import('../middleware/logger.js');
  await request('GET', '/events');
  await new Promise((done) => setTimeout(done, 100));
  const lines = readFileSync(logFile, 'utf8').trim().split('\n');
  assert.ok(lines.some((line) => / GET \/api\/events 200 [\d.]+ms guest$/.test(line)));
  assert.ok(lines.some((line) => / DELETE \/api\/tickets\/\d+ 200 [\d.]+ms user=\d+$/.test(line)));
});

test('битый JSON даёт 400, а сбой базы внутри маршрута — 500 и запись ERROR в лог', async () => {
  const res = await fetch(baseUrl + '/login', {
    method: 'POST', body: '{не json', headers: { 'X-Afisha-Request': '1', 'Content-Type': 'application/json' },
  });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'Проверьте запрос.' });

  const { logFile } = await import('../middleware/logger.js');
  const quiet = console.error;
  console.error = () => {};
  db.exec('ALTER TABLE EventDetails RENAME TO EventDetailsBroken');
  try {
    await request('GET', '/events', { status: 500 }).then(({ data }) =>
      assert.deepEqual(data, { error: 'Сервер не смог выполнить запрос.' }));
  } finally {
    db.exec('ALTER TABLE EventDetailsBroken RENAME TO EventDetails');
    console.error = quiet;
  }
  await new Promise((done) => setTimeout(done, 100));
  const log = readFileSync(logFile, 'utf8');
  assert.match(log, / ERROR GET \/api\/events /);
  assert.match(log, / GET \/api\/events 500 /);
  assert.equal((await request('GET', '/events')).data.length > 0, true);
});

test('клиент с другого порта получает разрешение CORS, чужой сайт — нет', async () => {
  const client = 'http://localhost:5173';
  const preflight = await fetch(baseUrl + '/account', {
    method: 'OPTIONS',
    headers: { Origin: client, 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'content-type, x-afisha-request' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), client);
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  assert.match(preflight.headers.get('access-control-allow-methods'), /PATCH/);
  const allowed = await fetch(baseUrl + '/events', { headers: { Origin: client } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), client);
  const stranger = await fetch(baseUrl + '/events', { headers: { Origin: 'https://evil.example' } });
  assert.equal(stranger.headers.get('access-control-allow-origin'), null);
  const home = await fetch(baseUrl.replace(/\/api$/, '/'));
  assert.equal((await home.json()).client, client);
});

test('номер возвращённого билета не выдаётся повторно', async () => {
  const cookie = await register('renumber');
  const buy = async () => (await request('POST', '/tickets/witcher', { cookie, body: { requestId: randomUUID() } })).data.tickets;
  const [first] = await buy();
  await request('DELETE', '/tickets/' + first.number, { cookie });
  const [second] = await buy();
  assert.ok(second.number > first.number, `после возврата №${first.number} новый билет получил №${second.number}`);
});
