import { clientOrigin } from '../config.js';

// Клиент открыт на другом порту, для браузера это другой источник (origin).
// Браузер отдаст ответ странице, только если сервер явно разрешит этот источник.
export function allowClient(req, res, next) {
  res.vary('Origin');
  if (req.get('Origin') !== clientOrigin) return next();
  res.set('Access-Control-Allow-Origin', clientOrigin);
  res.set('Access-Control-Allow-Credentials', 'true');
  // Перед PUT, PATCH, DELETE и запросами со своими заголовками браузер сначала спрашивает разрешение (OPTIONS).
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Afisha-Request');
    res.set('Access-Control-Max-Age', '600');
    return res.sendStatus(204);
  }
  next();
}
