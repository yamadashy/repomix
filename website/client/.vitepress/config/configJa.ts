import { type DefaultTheme, defineConfig } from 'vitepress';

export const configJa = defineConfig({
  lang: 'ja',
  description: 'コードベースをAIフレンドリーな形式にパッケージング',
  themeConfig: {
    nav: [
      // guide
      { text: '使い方', link: '/ja/guide/', activeMatch: '^/ja/guide/' },
      { text: 'Chrome拡張', link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa' },
      { text: 'Discordに参加', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/ja/guide/': [
        {
          text: 'はじめに',
          items: [
            { text: 'はじめに', link: '/ja/guide/' },
            { text: 'インストール', link: '/ja/guide/installation' },
            { text: '基本的な使い方', link: '/ja/guide/usage' },
            { text: 'プロンプト例', link: '/ja/guide/prompt-examples' },
            { text: 'ユースケース', link: '/ja/guide/use-cases' },
          ],
        },
        {
          text: '使い方',
          items: [
            { text: '出力フォーマット', link: '/ja/guide/output' },
            { text: 'コマンドラインオプション', link: '/ja/guide/command-line-options' },
            { text: '設定', link: '/ja/guide/configuration' },
            { text: 'カスタム指示', link: '/ja/guide/custom-instructions' },
            { text: 'GitHubリポジトリの処理', link: '/ja/guide/remote-repository-processing' },
            { text: 'コメントの削除', link: '/ja/guide/comment-removal' },
            { text: 'コード圧縮', link: '/ja/guide/code-compress' },
            { text: 'セキュリティ', link: '/ja/guide/security' },
          ],
        },
        {
          text: '高度な使い方',
          items: [
            { text: 'MCPサーバー', link: '/ja/guide/mcp-server' },
            { text: 'Claude Codeプラグイン', link: '/ja/guide/claude-code-plugins' },
            { text: 'Agent Skills生成', link: '/ja/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/ja/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/ja/guide/github-actions' },
            { text: 'ライブラリとしての使用', link: '/ja/guide/development/using-repomix-as-a-library' },
            { text: 'AI支援開発のヒント', link: '/ja/guide/tips/best-practices' },
          ],
        },
        {
          text: 'コミュニティ',
          items: [
            { text: 'コミュニティプロジェクト', link: '/ja/guide/community-projects' },
            { text: 'Repomixに貢献する', link: '/ja/guide/development/' },
            { text: 'スポンサー', link: '/ja/guide/sponsors' },
            { text: 'Privacy Policy', link: '/ja/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configJaSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  ja: {
    translations: {
      button: {
        buttonText: '検索',
        buttonAriaLabel: '検索',
      },
      modal: {
        noResultsText: '検索結果がありません',
        resetButtonTitle: '検索をリセット',
        backButtonTitle: '前に戻る',
        displayDetails: '詳細を表示',
        footer: {
          selectText: '選択',
          navigateText: '移動',
          closeText: '閉じる',
        },
      },
    },
  },
};
