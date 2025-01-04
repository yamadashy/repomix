import { defineConfig } from 'vitepress';

const googleAnalyticsTag = 'G-7PTT4PLC69';

export default defineConfig({
  title: 'Repomix',
  description: 'Packs your entire repository into AI-friendly formats',
  lastUpdated: true,
  metaChunk: true,
  sitemap: {
    hostname: 'http://repomix.com/',
  },
  themeConfig: {
    logo: { src: '/images/repomix-logo.svg', width: 24, height: 24 },
    nav: [{ text: 'GitHub', link: 'https://github.com/yamadashy/repomix' }],
    socialLinks: [{ icon: 'discord', link: 'https://discord.gg/wNYzTwZFku' }],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Kazuki Yamada',
    },
  },
  head: [
    ['link', { rel: 'icon', href: '/images/repomix-logo.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
    ['meta', { property: 'og:title', content: 'Repomix' }],
    ['meta', { property: 'og:site_name', content: 'Repomix' }],
    ['meta', { property: 'og:image', content: 'http://repomix.com/images/og-image.png' }],
    ['meta', { property: 'og:url', content: 'http://repomix.com/' }],
    ['meta', { property: 'og:description', content: 'Packs your entire repository into AI-friendly formats' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon/favicon-96x96.png', sizes: '96x96' }],
    ['meta', { name: 'theme-color', content: '#f97316' }],
    [
      'script',
      {
        async: true,
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
});
