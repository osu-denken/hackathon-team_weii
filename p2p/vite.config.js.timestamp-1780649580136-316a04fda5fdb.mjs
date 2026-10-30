// vite.config.js
import { defineConfig } from "file:///C:/workspace/kmmz1127/hackathon-team_weii/p2p/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { viteStaticCopy } from "file:///C:/workspace/kmmz1127/hackathon-team_weii/p2p/node_modules/vite-plugin-static-copy/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///C:/workspace/kmmz1127/hackathon-team_weii/p2p/vite.config.js";
var __dirname = fileURLToPath(new URL(".", __vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
  base: "./",
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "../asset",
          dest: ""
        },
        {
          src: "README.md",
          dest: ""
        }
      ]
    })
  ],
  publicDir: resolve(__dirname, "../backend/public"),
  resolve: {
    alias: [
      {
        find: /.*\/constants\/gameConfig\.js$/,
        replacement: resolve(__dirname, "./src/mock/gameConfig.js")
      },
      {
        find: /.*\/constants\/systemConfig\.js$/,
        replacement: resolve(__dirname, "./src/mock/systemConfig.js")
      }
    ]
  },
  server: {
    port: 5173,
    open: "/host.html"
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        client: resolve(__dirname, "client.html"),
        host: resolve(__dirname, "host.html")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFx3b3Jrc3BhY2VcXFxca21tejExMjdcXFxcaGFja2F0aG9uLXRlYW1fd2VpaVxcXFxwMnBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXHdvcmtzcGFjZVxcXFxrbW16MTEyN1xcXFxoYWNrYXRob24tdGVhbV93ZWlpXFxcXHAycFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovd29ya3NwYWNlL2ttbXoxMTI3L2hhY2thdGhvbi10ZWFtX3dlaWkvcDJwL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCB7IHZpdGVTdGF0aWNDb3B5IH0gZnJvbSAndml0ZS1wbHVnaW4tc3RhdGljLWNvcHknO1xuXG5jb25zdCBfX2Rpcm5hbWUgPSBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4nLCBpbXBvcnQubWV0YS51cmwpKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgYmFzZTogJy4vJyxcbiAgcGx1Z2luczogW1xuICAgIHZpdGVTdGF0aWNDb3B5KHtcbiAgICAgIHRhcmdldHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHNyYzogJy4uL2Fzc2V0JyxcbiAgICAgICAgICBkZXN0OiAnJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc3JjOiAnUkVBRE1FLm1kJyxcbiAgICAgICAgICBkZXN0OiAnJ1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfSlcbiAgXSxcbiAgcHVibGljRGlyOiByZXNvbHZlKF9fZGlybmFtZSwgJy4uL2JhY2tlbmQvcHVibGljJyksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczogW1xuICAgICAge1xuICAgICAgICBmaW5kOiAvLipcXC9jb25zdGFudHNcXC9nYW1lQ29uZmlnXFwuanMkLyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IHJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvbW9jay9nYW1lQ29uZmlnLmpzJylcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6IC8uKlxcL2NvbnN0YW50c1xcL3N5c3RlbUNvbmZpZ1xcLmpzJC8sXG4gICAgICAgIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL21vY2svc3lzdGVtQ29uZmlnLmpzJylcbiAgICAgIH1cbiAgICBdXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgb3BlbjogJy9ob3N0Lmh0bWwnXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksXG4gICAgICAgIGNsaWVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICdjbGllbnQuaHRtbCcpLFxuICAgICAgICBob3N0OiByZXNvbHZlKF9fZGlybmFtZSwgJ2hvc3QuaHRtbCcpXG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVUsU0FBUyxvQkFBb0I7QUFDaFcsU0FBUyxlQUFlO0FBQ3hCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsc0JBQXNCO0FBSDRLLElBQU0sMkNBQTJDO0FBSzVQLElBQU0sWUFBWSxjQUFjLElBQUksSUFBSSxLQUFLLHdDQUFlLENBQUM7QUFFN0QsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLElBQ1AsZUFBZTtBQUFBLE1BQ2IsU0FBUztBQUFBLFFBQ1A7QUFBQSxVQUNFLEtBQUs7QUFBQSxVQUNMLE1BQU07QUFBQSxRQUNSO0FBQUEsUUFDQTtBQUFBLFVBQ0UsS0FBSztBQUFBLFVBQ0wsTUFBTTtBQUFBLFFBQ1I7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsV0FBVyxRQUFRLFdBQVcsbUJBQW1CO0FBQUEsRUFDakQsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0w7QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLGFBQWEsUUFBUSxXQUFXLDBCQUEwQjtBQUFBLE1BQzVEO0FBQUEsTUFDQTtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sYUFBYSxRQUFRLFdBQVcsNEJBQTRCO0FBQUEsTUFDOUQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLE9BQU87QUFBQSxRQUNMLE1BQU0sUUFBUSxXQUFXLFlBQVk7QUFBQSxRQUNyQyxRQUFRLFFBQVEsV0FBVyxhQUFhO0FBQUEsUUFDeEMsTUFBTSxRQUFRLFdBQVcsV0FBVztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
