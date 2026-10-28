import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Chat apps don't run the app's code when they show a link preview, so join links get their own
// copy of the page with the "Join my household!" image. vercel.json sends /join/... to it.
// Every build gets its own id. The app compares it with /version.json on the server to know when a
// newer version is out, even when a phone's home screen app misses the normal update check.
const BUILD_ID = String(Date.now())

function buildVersion() {
  return {
    name: 'build-version',
    apply: 'build' as const,
    generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
    },
  }
}

function joinPreview() {
  return {
    name: 'join-preview',
    apply: 'build' as const,
    closeBundle() {
      const dist = resolve(__dirname, 'dist')
      const html = readFileSync(resolve(dist, 'index.html'), 'utf8')
      const preview = `<!-- share-preview -->
    <meta name="description" content="Join my household on Pichigoose." />
    <meta property="og:site_name" content="Pichigoose" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Join my household on Pichigoose" />
    <meta property="og:description" content="Planning your household with the people you live with, so everyone stays organized." />
    <meta property="og:image" content="https://www.pichigoose.com/og/join.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Pichi the goose on a postage stamp, with Join my household!" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://www.pichigoose.com/og/join.jpg" />
    <!-- /share-preview -->`
      const out = html.replace(/<!-- share-preview -->[\s\S]*<!-- \/share-preview -->/, preview)
      if (out === html) throw new Error('join-preview: share-preview block not found in index.html')
      writeFileSync(resolve(dist, 'join.html'), out)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    buildVersion(),
    react(),
    joinPreview(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered in src/main.tsx, so the app can reload itself when a new version is out.
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png', 'favicon.ico'],
      manifest: {
        name: 'Pichigoose',
        short_name: 'Pichigoose',
        description: 'Planning your household with the people you live with, so everyone stays organized.',
        theme_color: '#FFFDF8',
        background_color: '#FFFDF8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole app, fonts and textures are saved on the phone so it opens without signal.
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*', '**/*.woff'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
