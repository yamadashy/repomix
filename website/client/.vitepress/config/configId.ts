import { type DefaultTheme, defineConfig } from 'vitepress';

export const configId = defineConfig({
  lang: 'id',
  description: 'Kemas basis kode Anda ke dalam format yang ramah AI',
  themeConfig: {
    nav: [
      { text: 'Panduan', link: '/id/guide/', activeMatch: '^/id/guide/' },
      {
        text: 'Ekstensi Chrome',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Bergabung Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/id/guide/': [
        {
          text: 'Pengantar',
          items: [
            { text: 'Memulai', link: '/id/guide/' },
            { text: 'Instalasi', link: '/id/guide/installation' },
            { text: 'Penggunaan Dasar', link: '/id/guide/usage' },
            { text: 'Contoh Prompt', link: '/id/guide/prompt-examples' },
            { text: 'Kasus Penggunaan', link: '/id/guide/use-cases' },
          ],
        },
        {
          text: 'Panduan',
          items: [
            { text: 'Format Output', link: '/id/guide/output' },
            { text: 'Opsi Baris Perintah', link: '/id/guide/command-line-options' },
            { text: 'Konfigurasi', link: '/id/guide/configuration' },
            { text: 'Instruksi Khusus', link: '/id/guide/custom-instructions' },
            { text: 'Pemrosesan Repositori GitHub', link: '/id/guide/remote-repository-processing' },
            { text: 'Penghapusan Komentar', link: '/id/guide/comment-removal' },
            { text: 'Kompresi Kode', link: '/id/guide/code-compress' },
            { text: 'Keamanan', link: '/id/guide/security' },
          ],
        },
        {
          text: 'Lanjutan',
          items: [
            { text: 'Server MCP', link: '/id/guide/mcp-server' },
            { text: 'Plugin Claude Code', link: '/id/guide/claude-code-plugins' },
            { text: 'Pembuatan Agent Skills', link: '/id/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/id/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/id/guide/github-actions' },
            {
              text: 'Menggunakan Repomix sebagai Library',
              link: '/id/guide/development/using-repomix-as-a-library',
            },
            { text: 'Tips Pengembangan dengan Bantuan AI', link: '/id/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Komunitas',
          items: [
            { text: 'Proyek Komunitas', link: '/id/guide/community-projects' },
            { text: 'Berkontribusi ke Repomix', link: '/id/guide/development/' },
            { text: 'Sponsor', link: '/id/guide/sponsors' },
            { text: 'Privacy Policy', link: '/id/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configIdSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  id: {
    translations: {
      button: {
        buttonText: 'Cari',
        buttonAriaLabel: 'Cari',
      },
      modal: {
        noResultsText: 'Tidak ada hasil ditemukan',
        resetButtonTitle: 'Reset pencarian',
        backButtonTitle: 'Kembali',
        displayDetails: 'Tampilkan detail',
        footer: {
          selectText: 'Pilih',
          navigateText: 'Navigasi',
          closeText: 'Tutup',
        },
      },
    },
  },
};
