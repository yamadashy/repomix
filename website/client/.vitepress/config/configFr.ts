import { type DefaultTheme, defineConfig } from 'vitepress';

export const configFr = defineConfig({
  lang: 'fr-FR',
  description: "Empaquetez votre code dans des formats adaptés à l'IA",
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/fr/guide/', activeMatch: '^/fr/guide/' },
      {
        text: 'Extension Chrome',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Rejoindre Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/fr/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Pour commencer', link: '/fr/guide/' },
            { text: 'Installation', link: '/fr/guide/installation' },
            { text: 'Utilisation de base', link: '/fr/guide/usage' },
            { text: 'Exemples de prompts', link: '/fr/guide/prompt-examples' },
            { text: "Cas d'Usage", link: '/fr/guide/use-cases' },
          ],
        },
        {
          text: 'Guide',
          items: [
            { text: 'Formats de sortie', link: '/fr/guide/output' },
            { text: 'Options de ligne de commande', link: '/fr/guide/command-line-options' },
            { text: 'Configuration', link: '/fr/guide/configuration' },
            { text: 'Instructions personnalisées', link: '/fr/guide/custom-instructions' },
            { text: 'Traitement des dépôts GitHub', link: '/fr/guide/remote-repository-processing' },
            { text: 'Suppression des commentaires', link: '/fr/guide/comment-removal' },
            { text: 'Compression de code', link: '/fr/guide/code-compress' },
            { text: 'Sécurité', link: '/fr/guide/security' },
          ],
        },
        {
          text: 'Avancé',
          items: [
            { text: 'Serveur MCP', link: '/fr/guide/mcp-server' },
            { text: 'Plugins Claude Code', link: '/fr/guide/claude-code-plugins' },
            { text: "Génération d'Agent Skills", link: '/fr/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/fr/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/fr/guide/github-actions' },
            {
              text: 'Utiliser Repomix comme bibliothèque',
              link: '/fr/guide/development/using-repomix-as-a-library',
            },
            { text: 'Conseils pour le développement assisté par IA', link: '/fr/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Communauté',
          items: [
            { text: 'Projets de la Communauté', link: '/fr/guide/community-projects' },
            { text: 'Contribuer à Repomix', link: '/fr/guide/development/' },
            { text: 'Sponsors', link: '/fr/guide/sponsors' },
            { text: 'Privacy Policy', link: '/fr/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configFrSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  fr: {
    translations: {
      button: {
        buttonText: 'Rechercher',
        buttonAriaLabel: 'Rechercher',
      },
      modal: {
        noResultsText: 'Aucun résultat trouvé',
        resetButtonTitle: 'Réinitialiser la recherche',
        backButtonTitle: 'Retour',
        displayDetails: 'Afficher les détails',
        footer: {
          selectText: 'Sélectionner',
          navigateText: 'Naviguer',
          closeText: 'Fermer',
        },
      },
    },
  },
};
