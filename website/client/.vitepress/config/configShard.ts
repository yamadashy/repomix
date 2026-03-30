import { visualizer } from 'rollup-plugin-visualizer';
import { type ManifestOptions, VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';
import { configDeSearch } from './configDe';
import { configEsSearch } from './configEs';
import { configHiSearch } from './configHi';
import { configIdSearch } from './configId';
import { configItSearch } from './configIt';
import { configJaSearch } from './configJa';
import { configKoSearch } from './configKo';
import { configPtBrSearch } from './configPtBr';
import { configRuSearch } from './configRu';
import { configTrSearch } from './configTr';
import { configViSearch } from './configVi';
import { configZhCnSearch } from './configZhCn';
import { configZhTwSearch } from './configZhTw';

// Site Metadata
const siteName = 'Repomix';
const siteUrl = 'https://repomix.com';
const siteDescription = 'Pack your codebase into AI-friendly formats';
const ogImageUrl = `${siteUrl}/images/og-image-large.png`;
const githubUrl = 'https://github.com/yamadashy/repomix';
const npmUrl = 'https://www.npmjs.com/package/repomix';

const googleAnalyticsTag = 'G-7PTT4PLC69';

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
      description: siteDescription,
    },
    {
      '@type': 'SoftwareApplication',
      name: siteName,
      description:
        'A tool that packs your entire repository into a single, AI-friendly file for use with Large Language Models (LLMs) like ChatGPT, Claude, Gemini, and more.',
      url: siteUrl,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Windows, macOS, Linux',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      installUrl: npmUrl,
      downloadUrl: npmUrl,
      softwareRequirements: 'Node.js 20.0.0 or higher',
      image: `${siteUrl}/images/repomix-logo.svg`,
      screenshot: ogImageUrl,
      author: {
        '@type': 'Person',
        name: 'Kazuki Yamada',
        url: 'https://github.com/yamadashy',
      },
      sameAs: [githubUrl, npmUrl],
      featureList: [
        'AI-optimized output formats (XML, Markdown, JSON, Plain Text)',
        'Token counting for LLM context limits',
        'Git-aware file processing',
        'Security-focused with Secretlint integration',
        'Remote repository processing',
        'MCP Server integration',
        'Code compression with Tree-sitter',
        'Custom instructions support',
      ],
    },
  ],
};

// PWA Manifest Configuration
const manifest: Partial<ManifestOptions> = {
  name: siteName,
  short_name: siteName,
  description: siteDescription,
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
  title: siteName,

  srcDir: 'src',

  rewrites: {
    // rewrite to `en` locale
    'en/:rest*': ':rest*',
  },

  lastUpdated: true,
  cleanUrls: true,
  metaChunk: true,

  sitemap: {
    hostname: `${siteUrl}/`,
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
          ...configTrSearch,
          ...configViSearch,
          ...configZhCnSearch,
          ...configZhTwSearch,
        },
      },
    },
    socialLinks: [
      { icon: 'x', link: 'https://x.com/repomix_ai' },
      { icon: 'discord', link: 'https://discord.gg/wNYzTwZFku' },
      { icon: 'github', link: githubUrl },
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
    // JSON-LD Structured Data
    ['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd)],

    // Favicon
    ['link', { rel: 'icon', href: '/images/repomix-logo.svg' }],

    // OGP
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: siteName }],
    ['meta', { property: 'og:site_name', content: siteName }],
    ['meta', { property: 'og:image', content: ogImageUrl }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:description', content: siteDescription }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'twitter:domain', content: 'repomix.com' }],
    ['meta', { property: 'twitter:url', content: siteUrl }],
    ['meta', { name: 'twitter:title', content: siteName }],
    ['meta', { name: 'twitter:description', content: siteDescription }],
    ['meta', { name: 'twitter:image', content: ogImageUrl }],
    ['meta', { name: 'thumbnail', content: ogImageUrl }],

    // PWA
    ['meta', { name: 'theme-color', content: '#f97316' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: siteName }],
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
      ...llmstxt({
        workDir: 'en',
        domain: siteUrl,
      }),
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
