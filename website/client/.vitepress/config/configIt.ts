import { type DefaultTheme, defineConfig } from 'vitepress';

export const configIt = defineConfig({
  lang: 'it-IT',
  description: "Impacchetta il tuo codice in formati adatti all'IA",
  themeConfig: {
    nav: [
      { text: 'Guida', link: '/it/guide/', activeMatch: '^/it/guide/' },
      {
        text: 'Estensione Chrome',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Unisciti a Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/it/guide/': [
        {
          text: 'Introduzione',
          items: [
            { text: 'Per Iniziare', link: '/it/guide/' },
            { text: 'Installazione', link: '/it/guide/installation' },
            { text: 'Utilizzo Base', link: '/it/guide/usage' },
            { text: 'Esempi di Prompt', link: '/it/guide/prompt-examples' },
            { text: "Casi d'Uso", link: '/it/guide/use-cases' },
          ],
        },
        {
          text: 'Guida',
          items: [
            { text: 'Formati di Output', link: '/it/guide/output' },
            { text: 'Opzioni da Linea di Comando', link: '/it/guide/command-line-options' },
            { text: 'Configurazione', link: '/it/guide/configuration' },
            { text: 'Istruzioni Personalizzate', link: '/it/guide/custom-instructions' },
            { text: 'Elaborazione Repository Remoti', link: '/it/guide/remote-repository-processing' },
            { text: 'Rimozione Commenti', link: '/it/guide/comment-removal' },
            { text: 'Compressione Codice', link: '/it/guide/code-compress' },
            { text: 'Sicurezza', link: '/it/guide/security' },
          ],
        },
        {
          text: 'Avanzato',
          items: [
            { text: 'Server MCP', link: '/it/guide/mcp-server' },
            { text: 'Plugin Claude Code', link: '/it/guide/claude-code-plugins' },
            { text: 'Generazione Agent Skills', link: '/it/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/it/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/it/guide/github-actions' },
            {
              text: 'Utilizzare Repomix come Libreria',
              link: '/it/guide/development/using-repomix-as-a-library',
            },
            { text: 'Consigli per lo Sviluppo Assistito da IA', link: '/it/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Community',
          items: [
            { text: 'Progetti della Community', link: '/it/guide/community-projects' },
            { text: 'Contribuire a Repomix', link: '/it/guide/development/' },
            { text: 'Sponsor', link: '/it/guide/sponsors' },
            { text: 'Privacy Policy', link: '/it/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configItSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  it: {
    translations: {
      button: {
        buttonText: 'Cerca',
        buttonAriaLabel: 'Cerca',
      },
      modal: {
        noResultsText: 'Nessun risultato trovato',
        resetButtonTitle: 'Reimposta ricerca',
        backButtonTitle: 'Indietro',
        displayDetails: 'Mostra dettagli',
        footer: {
          selectText: 'Seleziona',
          navigateText: 'Naviga',
          closeText: 'Chiudi',
        },
      },
    },
  },
};
