import { defineConfig } from 'vitepress';

const googleAnalyticsTag = 'G-7PTT4PLC69';

export default defineConfig({
  title: 'Repomix',
  description: 'Pack your codebase into AI-friendly formats',
  lastUpdated: true,
  metaChunk: true,
  sitemap: {
    hostname: 'http://repomix.com/',
  },
  themeConfig: {
    logo: { src: '/images/repomix-logo.svg', width: 24, height: 24 },
    search: {
      provider: 'local',
    },
    nav: [
      // guide
      { text: 'Guide', link: '/guide/' },
      { text: 'Join Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Basic Usage', link: '/guide/usage' },
            { text: 'Prompt Examples', link: '/guide/prompt-examples' },
            { text: 'Output Formats', link: '/guide/output' },
            { text: 'Command Line Options', link: '/guide/command-line-options' },
            { text: 'Remote Repository Processing', link: '/guide/remote-repository-processing' },
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Custom Instructions', link: '/guide/custom-instructions' },
            { text: 'Comment Removal', link: '/guide/comment-removal' },
            { text: 'Security', link: '/guide/security' },
            {
              text: 'Tips & Tricks',
              items: [{ text: 'Best Practices', link: '/guide/tips/best-practices' }],
            },
            {
              text: 'Development',
              items: [
                { text: 'Contributing', link: '/guide/development/' },
                { text: 'Setup', link: '/guide/development/setup' },
              ],
            },
          ],
        },
      ],
      '/development/': [
        {
          text: 'Development',
          items: [
            { text: 'Contributing', link: '/development/' },
            { text: 'Setup', link: '/development/setup' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'discord', link: 'https://discord.gg/wNYzTwZFku' },
      { icon: 'github', link: 'https://github.com/yamadashy/repomix' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Kazuki Yamada',
    },
  },
  head: [
    // Favicon
    ['link', { rel: 'icon', href: '/images/repomix-logo.svg' }],

    // OGP
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
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

    // Google Analytics
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
  sitemap: {
    hostname: 'https://repomix.com'
  }
});
