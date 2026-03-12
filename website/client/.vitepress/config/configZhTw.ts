import { type DefaultTheme, defineConfig } from 'vitepress';

export const configZhTw = defineConfig({
  lang: 'zh-TW',
  description: '將程式碼庫打包成AI友好的格式',
  themeConfig: {
    nav: [
      { text: '指南', link: '/zh-tw/guide/', activeMatch: '^/zh-tw/guide/' },
      {
        text: 'Chrome擴充功能',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: '加入 Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/zh-tw/guide/': [
        {
          text: '介紹',
          items: [
            { text: '開始使用', link: '/zh-tw/guide/' },
            { text: '安裝', link: '/zh-tw/guide/installation' },
            { text: '基本用法', link: '/zh-tw/guide/usage' },
            { text: '提示範例', link: '/zh-tw/guide/prompt-examples' },
            { text: '使用案例', link: '/zh-tw/guide/use-cases' },
          ],
        },
        {
          text: '指南',
          items: [
            { text: '輸出格式', link: '/zh-tw/guide/output' },
            { text: '命令行選項', link: '/zh-tw/guide/command-line-options' },
            { text: '配置', link: '/zh-tw/guide/configuration' },
            { text: '自定義指令', link: '/zh-tw/guide/custom-instructions' },
            { text: 'GitHub倉庫處理', link: '/zh-tw/guide/remote-repository-processing' },
            { text: '註釋移除', link: '/zh-tw/guide/comment-removal' },
            { text: '程式碼壓縮', link: '/zh-tw/guide/code-compress' },
            { text: '安全性', link: '/zh-tw/guide/security' },
          ],
        },
        {
          text: '高級',
          items: [
            { text: 'MCP 伺服器', link: '/zh-tw/guide/mcp-server' },
            { text: 'Claude Code 外掛', link: '/zh-tw/guide/claude-code-plugins' },
            { text: 'Agent Skills 生成', link: '/zh-tw/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/zh-tw/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/zh-tw/guide/github-actions' },
            { text: '作為庫使用 Repomix', link: '/zh-tw/guide/development/using-repomix-as-a-library' },
            { text: 'AI輔助開發技巧', link: '/zh-tw/guide/tips/best-practices' },
          ],
        },
        {
          text: '社群',
          items: [
            { text: '社群專案', link: '/zh-tw/guide/community-projects' },
            { text: '為Repomix做貢獻', link: '/zh-tw/guide/development/' },
            { text: '贊助商', link: '/zh-tw/guide/sponsors' },
            { text: 'Privacy Policy', link: '/zh-tw/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configZhTwSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  'zh-TW': {
    translations: {
      button: {
        buttonText: '搜尋',
        buttonAriaLabel: '搜尋',
      },
      modal: {
        noResultsText: '未找到相關結果',
        resetButtonTitle: '清除搜尋',
        backButtonTitle: '返回',
        displayDetails: '顯示詳情',
        footer: {
          selectText: '選擇',
          navigateText: '切換',
          closeText: '關閉',
        },
      },
    },
  },
};
