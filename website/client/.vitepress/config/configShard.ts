import { visualizer } from 'rollup-plugin-visualizer';
import { type ManifestOptions, VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitepress';
import { configDeSearch } from './configDe';
import { configEsSearch } from './configEs';
import { configHiSearch } from './configHi';
import { configIdSearch } from './configId';
import { configItSearch } from './configIt';
import { configJaSearch } from './configJa';
import { configKoSearch } from './configKo';
import { configPtBrSearch } from './configPtBr';
import { configRuSearch } from './configRu';
import { configViSearch } from './configVi';
import { configZhCnSearch } from './configZhCn';
import { configZhTwSearch } from './configZhTw';

const googleAnalyticsTag = 'G-7PTT4PLC69';

// PWA Manifest Configuration
const manifest: Partial<ManifestOptions> = {
  name: 'Repomix',
  short_name: 'Repomix',
  description: 'Pack your codebase into AI-friendly formats',
  theme_color: '#f97316',
  background_color: '#ffffff',
  display: 'standalone',
  icons: [
    {
      src: '/images/pwa/repomix-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/images/pwa/repomix-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: '/images/pwa/repomix-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};

export const configShard = defineConfig({
  title: 'Repomix',

  srcDir: 'src',

  rewrites: {
    // rewrite to `en` locale
    'en/:rest*': ':rest*',
  },

  lastUpdated: true,
  cleanUrls: true,
  metaChunk: true,

  sitemap: {
    hostname: 'https://repomix.com/',
  },

  // Shared configuration
  themeConfig: {
    logo: { src: '/images/repomix-logo.svg', width: 24, height: 24 },
    search: {
      provider: 'local',
      options: {
        locales: {
          ...configDeSearch,
          ...configEsSearch,
          ...configHiSearch,
          ...configIdSearch,
          ...configItSearch,
          ...configJaSearch,
          ...configKoSearch,
          ...configPtBrSearch,
          ...configRuSearch,
          ...configViSearch,
          ...configZhCnSearch,
          ...configZhTwSearch,
        },
      },
    },
    socialLinks: [
      { icon: 'x', link: 'https://x.com/repomix_ai' },
      { icon: 'discord', link: 'https://discord.gg/wNYzTwZFku' },
      { icon: 'github', link: 'https://github.com/yamadashy/repomix' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Kazuki Yamada',
    },
    outline: [2, 3],
    // Language selection
    langMenuLabel: 'Languages',
  },

  head: [
    // Favicon
    ['link', { rel: 'icon', href: '/images/repomix-logo.svg' }],

    // OGP
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Repomix' }],
    ['meta', { property: 'og:site_name', content: 'Repomix' }],
    ['meta', { property: 'og:image', content: 'https://repomix.com/images/og-image-large.png' }],
    ['meta', { property: 'og:url', content: 'https://repomix.com' }],
    ['meta', { property: 'og:description', content: 'Pack your codebase into AI-friendly formats' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'twitter:domain', content: 'https://repomix.com' }],
    ['meta', { property: 'twitter:url', content: 'https://repomix.com' }],
    ['meta', { name: 'twitter:title', content: 'Repomix' }],
    ['meta', { name: 'twitter:description', content: 'Pack your codebase into AI-friendly formats' }],
    ['meta', { name: 'twitter:image', content: 'https://repomix.com/images/og-image-large.png' }],
    ['meta', { name: 'thumbnail', content: 'https://repomix.com/images/og-image-large.png' }],

    // PWA
    ['meta', { name: 'theme-color', content: '#f97316' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'Repomix' }],
    ['link', { rel: 'apple-touch-icon', href: '/images/pwa/repomix-192x192.png' }],
    ['link', { rel: 'mask-icon', href: '/images/repomix-logo.svg', color: '#f97316' }],

    // Google Analytics
    [
      'script',
      {
        async: 'true',
        src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsTag}`,
      },
    ],
    [
      'script',
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${googleAnalyticsTag}');`,
    ],
  ],

  vite: {
    build: {
      rollupOptions: {
        plugins: [
          visualizer({
            filename: 'stats.html',
            open: false,
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
          }),
        ],
      },
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        manifest,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'static-resources-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 1 day
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
  },
});
