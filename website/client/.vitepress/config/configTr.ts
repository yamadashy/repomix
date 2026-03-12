import { type DefaultTheme, defineConfig } from 'vitepress';

export const configTr = defineConfig({
  lang: 'tr',
  description: 'Kod tabanınızı yapay zeka dostu formatlara dönüştürün',
  themeConfig: {
    nav: [
      { text: 'Rehber', link: '/tr/guide/', activeMatch: '^/tr/guide/' },
      {
        text: 'Chrome Eklentisi',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: "Discord'a Katıl", link: 'https://discord.gg/wNYzTwZFku' },
      { text: 'Gizlilik Politikası', link: '/tr/guide/privacy' },
    ],
    sidebar: {
      '/tr/guide/': [
        {
          text: 'Giriş',
          items: [
            { text: 'Başlarken', link: '/tr/guide/' },
            { text: 'Kurulum', link: '/tr/guide/installation' },
            { text: 'Temel Kullanım', link: '/tr/guide/usage' },
            { text: 'Prompt Örnekleri', link: '/tr/guide/prompt-examples' },
            { text: 'Kullanım Senaryoları', link: '/tr/guide/use-cases' },
          ],
        },
        {
          text: 'Rehber',
          items: [
            { text: 'Çıktı Formatları', link: '/tr/guide/output' },
            { text: 'Komut Satırı Seçenekleri', link: '/tr/guide/command-line-options' },
            { text: 'Yapılandırma', link: '/tr/guide/configuration' },
            { text: 'Özel Talimatlar', link: '/tr/guide/custom-instructions' },
            { text: 'GitHub Deposu İşleme', link: '/tr/guide/remote-repository-processing' },
            { text: 'Yorum Kaldırma', link: '/tr/guide/comment-removal' },
            { text: 'Kod Sıkıştırma', link: '/tr/guide/code-compress' },
            { text: 'Güvenlik', link: '/tr/guide/security' },
          ],
        },
        {
          text: 'Gelişmiş',
          items: [
            { text: 'MCP Sunucusu', link: '/tr/guide/mcp-server' },
            { text: 'Claude Code Eklentileri', link: '/tr/guide/claude-code-plugins' },
            { text: 'Agent Becerileri Oluşturma', link: '/tr/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Becerisi', link: '/tr/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/tr/guide/github-actions' },
            {
              text: "Repomix'i Kütüphane Olarak Kullanma",
              link: '/tr/guide/development/using-repomix-as-a-library',
            },
            { text: 'Yapay Zeka Destekli Geliştirme İpuçları', link: '/tr/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Topluluk',
          items: [
            { text: 'Topluluk Projeleri', link: '/tr/guide/community-projects' },
            { text: "Repomix'e Katkıda Bulunma", link: '/tr/guide/development/' },
            { text: 'Sponsorlar', link: '/tr/guide/sponsors' },
            { text: 'Gizlilik Politikası', link: '/tr/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configTrSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  tr: {
    translations: {
      button: {
        buttonText: 'Ara',
        buttonAriaLabel: 'Ara',
      },
      modal: {
        noResultsText: 'Sonuç bulunamadı',
        resetButtonTitle: 'Aramayı sıfırla',
        backButtonTitle: 'Geri',
        displayDetails: 'Ayrıntıları göster',
        footer: {
          selectText: 'Seç',
          navigateText: 'Gezin',
          closeText: 'Kapat',
        },
      },
    },
  },
};
