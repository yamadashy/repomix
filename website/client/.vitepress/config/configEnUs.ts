import { defineConfig } from 'vitepress';

export const configEnUs = defineConfig({
  lang: 'en-US',
  description: 'Pack your codebase into AI-friendly formats',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '^/guide/' },
      {
        text: 'Chrome Extension',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Join Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Basic Usage', link: '/guide/usage' },
            { text: 'Prompt Examples', link: '/guide/prompt-examples' },
            { text: 'Use Cases', link: '/guide/use-cases' },
          ],
        },
        {
          text: 'Guide',
          items: [
            { text: 'Output Formats', link: '/guide/output' },
            { text: 'Command Line Options', link: '/guide/command-line-options' },
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Custom Instructions', link: '/guide/custom-instructions' },
            { text: 'GitHub Repository Processing', link: '/guide/remote-repository-processing' },
            { text: 'Comment Removal', link: '/guide/comment-removal' },
            { text: 'Code Compression', link: '/guide/code-compress' },
            { text: 'Security', link: '/guide/security' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'MCP Server', link: '/guide/mcp-server' },
            { text: 'Claude Code Plugins', link: '/guide/claude-code-plugins' },
            { text: 'Agent Skills Generation', link: '/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/guide/github-actions' },
            { text: 'Using Repomix as a Library', link: '/guide/development/using-repomix-as-a-library' },
            { text: 'AI-Assisted Development Tips', link: '/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Community',
          items: [
            { text: 'Community Projects', link: '/guide/community-projects' },
            { text: 'Contributing to Repomix', link: '/guide/development/' },
            { text: 'Sponsors', link: '/guide/sponsors' },
            { text: 'Privacy Policy', link: '/guide/privacy' },
          ],
        },
      ],
    },
  },
});
