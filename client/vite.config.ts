import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Клиент работает на своём порту 5173, сервер API — на 5198 (адрес задан в src/api.ts).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
