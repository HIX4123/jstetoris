import path from 'node:path';

import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  build: {
    modulePreload: false,
    minify: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
