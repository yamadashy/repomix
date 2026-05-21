import { visualizer } from 'rollup-plugin-visualizer';
import { type ManifestOptions, VitePWA } from 'vite-plugin-pwa';
import { defineConfig, type HeadConfig } from 'vitepress';
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

type PageHeadContext = {
  page: string;
  title: string;
  description: string;
  pageData: {
    isNotFound?: boolean;
  };
};

// Order matters here: `en/...` is rewritten to the site root, so English
// content emits canonical URLs without a locale prefix. Every other locale
// keeps its folder as the URL prefix.
const supportedLocales = [
  'en',
  'zh-cn',
  'zh-tw',
  'ja',
  'es',
  'pt-br',
  'ko',
  'de',
  'fr',
  'it',
  'hi',
  'id',
  'vi',
  'ru',
  'tr',
] as const;

type Locale = (typeof supportedLocales)[number];

// BCP-47 codes used in `hreflang` and `inLanguage` (Schema.org accepts BCP-47).
const localeToBcp47: Record<Locale, string> = {
  en: 'en',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  ja: 'ja',
  es: 'es',
  'pt-br': 'pt-BR',
  ko: 'ko',
  de: 'de',
  fr: 'fr',
  it: 'it',
  hi: 'hi',
  id: 'id',
  vi: 'vi',
  ru: 'ru',
  tr: 'tr',
};

// `og:locale` uses underscore form, e.g. `en_US`, `pt_BR`.
const localeToOgLocale: Record<Locale, string> = {
  en: 'en_US',
  'zh-cn': 'zh_CN',
  'zh-tw': 'zh_TW',
  ja: 'ja_JP',
  es: 'es_ES',
  'pt-br': 'pt_BR',
  ko: 'ko_KR',
  de: 'de_DE',
  fr: 'fr_FR',
  it: 'it_IT',
  hi: 'hi_IN',
  id: 'id_ID',
  vi: 'vi_VN',
  ru: 'ru_RU',
  tr: 'tr_TR',
};

const stripPageSuffix = (rest: string) =>
  rest
    .replace(/\.md$/, '')
    .replace(/(^|\/)index$/, '$1')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

// Resolve the source page (e.g. `ja/guide/installation.md`) into its locale
// and the locale-relative remainder (`guide/installation`). English lives at
// `en/...` on disk but is served from the site root thanks to the `rewrites`
// rule, so the canonical URL omits the locale prefix.
const resolvePageLocale = (page: string): { locale: Locale; rest: string } => {
  for (const locale of supportedLocales) {
    if (page === `${locale}.md` || page === `${locale}/index.md` || page.startsWith(`${locale}/`)) {
      const remainder = page === `${locale}.md` || page === `${locale}/index.md` ? '' : page.slice(locale.length + 1);
      return { locale, rest: stripPageSuffix(remainder) };
    }
  }
  return { locale: 'en', rest: stripPageSuffix(page) };
};

const buildLocaleUrl = (locale: Locale, rest: string): string => {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  if (!rest) {
    return `${siteUrl}${prefix}`;
  }
  return `${siteUrl}${prefix}/${rest}`;
};

const createPageHead = ({ page, title, description, pageData }: PageHeadContext): HeadConfig[] => {
  if (pageData.isNotFound) {
    return [];
  }

  const { locale, rest } = resolvePageLocale(page);
  const url = buildLocaleUrl(locale, rest);
  const isHome = rest === '';

  const tags: HeadConfig[] = [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:locale', content: localeToOgLocale[locale] }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:url', content: url }],
    ['meta', { name: 'twitter:description', content: description }],
  ];

  // hreflang alternates so search engines can surface the right localized
  // page to each user. `x-default` falls back to English.
  for (const alt of supportedLocales) {
    tags.push([
      'link',
      {
        rel: 'alternate',
        hreflang: localeToBcp47[alt],
        href: buildLocaleUrl(alt, rest),
      },
    ]);
  }
  tags.push([
    'link',
    { rel: 'alternate', hreflang: 'x-default', href: buildLocaleUrl('en', rest) },
  ]);

  // For documentation pages, emit a TechArticle JSON-LD pointing back to the
  // global WebSite graph so AI/search surfaces can connect article content to
  // the product entity.
  if (!isHome) {
    const articleJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: title,
      description,
      inLanguage: localeToBcp47[locale],
      isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      image: ogImageUrl,
      author: {
        '@type': 'Person',
        name: 'Kazuki Yamada',
        url: 'https://github.com/yamadashy',
      },
    };
    tags.push(['script', { type: 'application/ld+json' }, JSON.stringify(articleJsonLd)]);
  }

  return tags;
};

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
      softwareRequirements: 'Node.js 22.0.0 or higher',
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
  srcExclude: ['shared/**'],

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

  transformHead: createPageHead,

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

    // Warm up the connection to Cloudflare Turnstile before the user clicks
    // pack so the script load + challenge round-trip don't add a cold-start
    // DNS/TLS handshake to the perceived latency. Resource hint only, no
    // request body — does not interact with Turnstile's challenge counter.
    //
    // Two `preconnect` hints: the bare one warms the connection pool used
    // for the anonymous `api.js` script fetch, and the `crossorigin`
    // variant warms the separate pool the Turnstile iframe uses for its
    // CORS sub-resources. Browsers treat these as distinct pools, so a
    // single hint only warms one of them.
    ['link', { rel: 'preconnect', href: 'https://challenges.cloudflare.com' }],
    ['link', { rel: 'preconnect', href: 'https://challenges.cloudflare.com', crossorigin: '' }],
    ['link', { rel: 'dns-prefetch', href: 'https://challenges.cloudflare.com' }],

    // OGP
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: siteName }],
    ['meta', { property: 'og:image', content: ogImageUrl }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:domain', content: 'repomix.com' }],
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
        ignoreFiles: ['guide/sponsors.md'],
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
