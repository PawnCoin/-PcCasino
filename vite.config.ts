import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

const cleanUrlsPlugin = (): Plugin => ({
  name: 'clean-urls',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const cleanPages = ['/privacy-policy', '/terms', '/about', '/contact'];
      if (cleanPages.includes(req.url ?? '')) {
        req.url = (req.url ?? '') + '.html';
      }
      next();
    });
  },
});

export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react(), cleanUrlsPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
