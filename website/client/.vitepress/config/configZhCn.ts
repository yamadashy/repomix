import { type DefaultTheme, defineConfig } from 'vitepress';

export const configZhCn = defineConfig({
  lang: 'zh-CN',
  description: '将代码库打包成AI友好的格式',
  themeConfig: {
    nav: [
      { text: '指南', link: '/zh-cn/guide/', activeMatch: '^/zh-cn/guide/' },
      { text: 'Chrome扩展', link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa' },
      { text: '加入 Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/zh-cn/guide/': [
        {
          text: '介绍',
          items: [
            { text: '开始使用', link: '/zh-cn/guide/' },
            { text: '安装', link: '/zh-cn/guide/installation' },
            { text: '基本用法', link: '/zh-cn/guide/usage' },
            { text: '提示示例', link: '/zh-cn/guide/prompt-examples' },
            { text: '使用场景', link: '/zh-cn/guide/use-cases' },
          ],
        },
        {
          text: '指南',
          items: [
            { text: '输出格式', link: '/zh-cn/guide/output' },
            { text: '命令行选项', link: '/zh-cn/guide/command-line-options' },
            { text: '配置', link: '/zh-cn/guide/configuration' },
            { text: '自定义指令', link: '/zh-cn/guide/custom-instructions' },
            { text: 'GitHub仓库处理', link: '/zh-cn/guide/remote-repository-processing' },
            { text: '注释移除', link: '/zh-cn/guide/comment-removal' },
            { text: '代码压缩', link: '/zh-cn/guide/code-compress' },
            { text: '安全性', link: '/zh-cn/guide/security' },
          ],
        },
        {
          text: '高级',
          items: [
            { text: 'MCP 服务器', link: '/zh-cn/guide/mcp-server' },
            { text: 'Claude Code 插件', link: '/zh-cn/guide/claude-code-plugins' },
            { text: 'Agent Skills 生成', link: '/zh-cn/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/zh-cn/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/zh-cn/guide/github-actions' },
            { text: '作为库使用 Repomix', link: '/zh-cn/guide/development/using-repomix-as-a-library' },
            { text: 'AI辅助开发技巧', link: '/zh-cn/guide/tips/best-practices' },
          ],
        },
        {
          text: '社区',
          items: [
            { text: '社区项目', link: '/zh-cn/guide/community-projects' },
            { text: '为Repomix做贡献', link: '/zh-cn/guide/development/' },
            { text: '赞助商', link: '/zh-cn/guide/sponsors' },
            { text: 'Privacy Policy', link: '/zh-cn/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configZhCnSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  'zh-CN': {
    translations: {
      button: {
        buttonText: '搜索',
        buttonAriaLabel: '搜索',
      },
      modal: {
        noResultsText: '未找到相关结果',
        resetButtonTitle: '清除搜索',
        backButtonTitle: '返回',
        displayDetails: '显示详情',
        footer: {
          selectText: '选择',
          navigateText: '切换',
          closeText: '关闭',
        },
      },
    },
  },
};
