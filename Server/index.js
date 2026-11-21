import { app } from './app.js';
import { clientOrigin, port } from './config.js';

app.listen(port, 'localhost', () => {
  console.log('Сервер API — http://localhost:' + port + '/api');
  console.log('Принимает запросы от клиента ' + clientOrigin);
});
