import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: '../asset',
          dest: ''
        },
        {
          // play/ から ./asset/... で参照されるため
          src: '../asset',
          dest: 'play'
        },
        {
          // 印刷用の簡易ガイド。docs/ では ../asset/ を参照しているので、dist 直下に置く形に直す
          src: '../docs/guide.html',
          dest: '',
          transform: (contents) => contents.toString().replaceAll('../asset/', './asset/')
        },
        {
          src: 'README.md',
          dest: ''
        },
        {
          src: '../asset/images/favicon.ico',
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
    open: '/host/'
  },
  build: {
    // host.js でトップレベル await を使うため
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        client: resolve(__dirname, 'client/index.html'),
        host: resolve(__dirname, 'host/index.html'),
        clientRedirect: resolve(__dirname, 'client.html'),
        hostRedirect: resolve(__dirname, 'host.html'),
        play: resolve(__dirname, 'play/index.html')
      }
    }
  }
});
