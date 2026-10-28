import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered in src/main.tsx, so the app can reload itself when a new version is out.
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
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
