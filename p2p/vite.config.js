import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: '../asset',
          dest: ''
        },
        {
          src: 'README.md',
          dest: ''
        }
      ]
    })
  ],
  publicDir: resolve(__dirname, '../backend/public'),
  resolve: {
    alias: [
      {
        find: /.*\/constants\/gameConfig\.js$/,
        replacement: resolve(__dirname, './src/mock/gameConfig.js')
      },
      {
        find: /.*\/constants\/systemConfig\.js$/,
        replacement: resolve(__dirname, './src/mock/systemConfig.js')
      }
    ]
  },
  server: {
    port: 5173,
    open: '/host.html'
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        client: resolve(__dirname, 'client.html'),
        host: resolve(__dirname, 'host.html')
      }
    }
  }
});
