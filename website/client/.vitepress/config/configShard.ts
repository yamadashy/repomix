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

// Stable @id for the global WebSite node so per-page schemas (e.g. TechArticle.isPartOf)
// can reference it via `@id` instead of inlining a fresh node, which Google treats
// as a separate entity.
const websiteId = `${siteUrl}#website`;

// Shared author block used by both the global SoftwareApplication JSON-LD and the
// per-page TechArticle JSON-LD.
const siteAuthor = {
  '@type': 'Person' as const,
  name: 'Kazuki Yamada',
  url: 'https://github.com/yamadashy',
};

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
// keeps its folder as the URL prefix. Each entry carries its BCP-47 form
// (used in `hreflang` and Schema.org `inLanguage`) and OpenGraph form
// (underscore-separated, e.g. `en_US`). Keeping all three together prevents
// drift when a new locale is added.
export const localeConfig = {
  en: { bcp47: 'en', og: 'en_US' },
  'zh-cn': { bcp47: 'zh-CN', og: 'zh_CN' },
  'zh-tw': { bcp47: 'zh-TW', og: 'zh_TW' },
  ja: { bcp47: 'ja', og: 'ja_JP' },
  es: { bcp47: 'es', og: 'es_ES' },
  'pt-br': { bcp47: 'pt-BR', og: 'pt_BR' },
  ko: { bcp47: 'ko', og: 'ko_KR' },
  de: { bcp47: 'de', og: 'de_DE' },
  fr: { bcp47: 'fr', og: 'fr_FR' },
  it: { bcp47: 'it', og: 'it_IT' },
  hi: { bcp47: 'hi', og: 'hi_IN' },
  id: { bcp47: 'id', og: 'id_ID' },
  vi: { bcp47: 'vi', og: 'vi_VN' },
  ru: { bcp47: 'ru', og: 'ru_RU' },
  tr: { bcp47: 'tr', og: 'tr_TR' },
} as const;

export type Locale = keyof typeof localeConfig;

const supportedLocales = Object.keys(localeConfig) as Locale[];

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
    ['meta', { property: 'og:type', content: isHome ? 'website' : 'article' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:locale', content: localeConfig[locale].og }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:url', content: url }],
    ['meta', { name: 'twitter:description', content: description }],
  ];

  // hreflang alternates so search engines can surface the right localized
  // page to each user. `x-default` falls back to English. We also emit an
  // `og:locale:alternate` for each non-current locale for social previews
  // that honor it.
  for (const alt of supportedLocales) {
    tags.push([
      'link',
      {
        rel: 'alternate',
        hreflang: localeConfig[alt].bcp47,
        href: buildLocaleUrl(alt, rest),
      },
    ]);
    if (alt !== locale) {
      tags.push(['meta', { property: 'og:locale:alternate', content: localeConfig[alt].og }]);
    }
  }
  tags.push(['link', { rel: 'alternate', hreflang: 'x-default', href: buildLocaleUrl('en', rest) }]);

  // For documentation pages, emit a TechArticle JSON-LD that points back to
  // the global WebSite node by `@id` so AI/search surfaces see a single
  // linked entity across pages instead of a fresh inline WebSite per page.
  if (!isHome) {
    const articleJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: title,
      description,
      inLanguage: localeConfig[locale].bcp47,
      isPartOf: { '@id': websiteId },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      image: ogImageUrl,
      author: siteAuthor,
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
      '@id': websiteId,
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
      author: siteAuthor,
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

    // OGP. `og:type` is emitted per-page from `createPageHead` (article for
    // docs, website for the home page) so we do not duplicate it here.
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
