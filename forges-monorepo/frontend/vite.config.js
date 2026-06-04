import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Prerenderer from '@prerenderer/rollup-plugin';
import Renderer from '@prerenderer/renderer-puppeteer';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import process from 'node:process';
import { getPrerenderRoutes } from './scripts/prerender-routes.mjs';

const commitSha = process.env.VITE_COMMIT_SHA ||
  (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'local'; } })();

export default defineConfig(async () => {
  const isPrerenderBuild = process.env.PRERENDER === '1';
  const prerenderRoutes = isPrerenderBuild ? await getPrerenderRoutes() : [];

  // Capture the prerendered root route HTML so we can write it in closeBundle
  let rootRouteHtml = null;

  // Plugin to write root index.html after bundle closes (workaround for Rolldown asset emit bug)
  const writeRootIndexPlugin = isPrerenderBuild ? {
    name: 'write-root-index',
    closeBundle() {
      if (rootRouteHtml) {
        const outDir = join(process.cwd(), 'dist');
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, 'index.html'), rootRouteHtml, 'utf-8');
        console.log('[prerender] dist/index.html written (root route)');
      }
    },
  } : null;

  return {
    define: {
      __COMMIT_SHA__: JSON.stringify(commitSha),
    },
    plugins: [
      react(),
      ...(isPrerenderBuild ? [
        new Prerenderer({
          routes: prerenderRoutes,
          renderer: new Renderer({
            renderAfterDocumentEvent: 'prerender-ready',
            timeout: 15000,
            headless: true,
          }),
          postProcess(renderedRoute) {
            renderedRoute.html = renderedRoute.html
              .replace(/http:\/\/localhost:\d+\//g, '/');
            if (renderedRoute.route === '/') {
              rootRouteHtml = renderedRoute.html;
            }
            return renderedRoute;
          },
        }),
        writeRootIndexPlugin,
      ] : []),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'vendor-charts';
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor-react';
            if (id.includes('node_modules/react')) return 'vendor-react';
            if (id.includes('node_modules/qrcode')) return 'vendor-qrcode';
            if (id.includes('node_modules/axios')) return 'vendor-api';
          },
        },
      },
      chunkSizeWarningLimit: 500,
    },
    server: { host: '0.0.0.0', port: 5173 },
    preview: { host: '0.0.0.0', port: 4173 },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      exclude: ['e2e/**', 'node_modules', 'dist', '.{idea,git,cache,tmp,temp}/**'],
    },
  };
});
