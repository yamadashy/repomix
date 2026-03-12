import { type DefaultTheme, defineConfig } from 'vitepress';

export const configDe = defineConfig({
  lang: 'de',
  description: 'Paketieren Sie Ihre Codebasis in KI-freundliche Formate',
  themeConfig: {
    nav: [
      { text: 'Anleitung', link: '/de/guide/', activeMatch: '^/de/guide/' },
      {
        text: 'Chrome-Erweiterung',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Discord beitreten', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/de/guide/': [
        {
          text: 'Einführung',
          items: [
            { text: 'Erste Schritte', link: '/de/guide/' },
            { text: 'Installation', link: '/de/guide/installation' },
            { text: 'Grundlegende Verwendung', link: '/de/guide/usage' },
            { text: 'Prompt-Beispiele', link: '/de/guide/prompt-examples' },
            { text: 'Anwendungsfälle', link: '/de/guide/use-cases' },
          ],
        },
        {
          text: 'Anleitung',
          items: [
            { text: 'Ausgabeformate', link: '/de/guide/output' },
            { text: 'Kommandozeilenoptionen', link: '/de/guide/command-line-options' },
            { text: 'Konfiguration', link: '/de/guide/configuration' },
            { text: 'Benutzerdefinierte Anweisungen', link: '/de/guide/custom-instructions' },
            { text: 'GitHub-Repository-Verarbeitung', link: '/de/guide/remote-repository-processing' },
            { text: 'Kommentare entfernen', link: '/de/guide/comment-removal' },
            { text: 'Code-Komprimierung', link: '/de/guide/code-compress' },
            { text: 'Sicherheit', link: '/de/guide/security' },
          ],
        },
        {
          text: 'Fortgeschritten',
          items: [
            { text: 'MCP-Server', link: '/de/guide/mcp-server' },
            { text: 'Claude Code Plugins', link: '/de/guide/claude-code-plugins' },
            { text: 'Agent Skills Generierung', link: '/de/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/de/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/de/guide/github-actions' },
            { text: 'Repomix als Bibliothek verwenden', link: '/de/guide/development/using-repomix-as-a-library' },
            { text: 'KI-unterstützte Entwicklungstipps', link: '/de/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Gemeinschaft',
          items: [
            { text: 'Community-Projekte', link: '/de/guide/community-projects' },
            { text: 'Zu Repomix beitragen', link: '/de/guide/development/' },
            { text: 'Sponsoren', link: '/de/guide/sponsors' },
            { text: 'Privacy Policy', link: '/de/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configDeSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  de: {
    translations: {
      button: {
        buttonText: 'Suchen',
        buttonAriaLabel: 'Suchen',
      },
      modal: {
        noResultsText: 'Keine Ergebnisse gefunden',
        resetButtonTitle: 'Suche zurücksetzen',
        backButtonTitle: 'Zurück',
        displayDetails: 'Details anzeigen',
        footer: {
          selectText: 'Auswählen',
          navigateText: 'Navigieren',
          closeText: 'Schließen',
        },
      },
    },
  },
};
