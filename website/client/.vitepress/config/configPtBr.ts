import { type DefaultTheme, defineConfig } from 'vitepress';

export const configPtBr = defineConfig({
  lang: 'pt-BR',
  description: 'Empacote sua base de código em formatos amigáveis para IA',
  themeConfig: {
    nav: [
      { text: 'Guia', link: '/pt-br/guide/', activeMatch: '^/pt-br/guide/' },
      {
        text: 'Extensão do Chrome',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Entrar no Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/pt-br/guide/': [
        {
          text: 'Introdução',
          items: [
            { text: 'Começando', link: '/pt-br/guide/' },
            { text: 'Instalação', link: '/pt-br/guide/installation' },
            { text: 'Uso Básico', link: '/pt-br/guide/usage' },
            { text: 'Exemplos de Prompt', link: '/pt-br/guide/prompt-examples' },
            { text: 'Casos de Uso', link: '/pt-br/guide/use-cases' },
          ],
        },
        {
          text: 'Guia',
          items: [
            { text: 'Formatos de Saída', link: '/pt-br/guide/output' },
            { text: 'Opções de Linha de Comando', link: '/pt-br/guide/command-line-options' },
            { text: 'Configuração', link: '/pt-br/guide/configuration' },
            { text: 'Instruções Personalizadas', link: '/pt-br/guide/custom-instructions' },
            { text: 'Processamento de Repositório GitHub', link: '/pt-br/guide/remote-repository-processing' },
            { text: 'Remoção de Comentários', link: '/pt-br/guide/comment-removal' },
            { text: 'Compressão de Código', link: '/pt-br/guide/code-compress' },
            { text: 'Segurança', link: '/pt-br/guide/security' },
          ],
        },
        {
          text: 'Avançado',
          items: [
            { text: 'Servidor MCP', link: '/pt-br/guide/mcp-server' },
            { text: 'Plugins do Claude Code', link: '/pt-br/guide/claude-code-plugins' },
            { text: 'Geração de Agent Skills', link: '/pt-br/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/pt-br/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/pt-br/guide/github-actions' },
            { text: 'Usando Repomix como Biblioteca', link: '/pt-br/guide/development/using-repomix-as-a-library' },
            { text: 'Dicas de Desenvolvimento Assistido por IA', link: '/pt-br/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Comunidade',
          items: [
            { text: 'Projetos da Comunidade', link: '/pt-br/guide/community-projects' },
            { text: 'Contribuindo para o Repomix', link: '/pt-br/guide/development/' },
            { text: 'Patrocinadores', link: '/pt-br/guide/sponsors' },
            { text: 'Privacy Policy', link: '/pt-br/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configPtBrSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  'pt-BR': {
    translations: {
      button: {
        buttonText: 'Pesquisar',
        buttonAriaLabel: 'Pesquisar',
      },
      modal: {
        noResultsText: 'Nenhum resultado encontrado',
        resetButtonTitle: 'Limpar pesquisa',
        backButtonTitle: 'Voltar',
        displayDetails: 'Mostrar detalhes',
        footer: {
          selectText: 'Selecionar',
          navigateText: 'Navegar',
          closeText: 'Fechar',
        },
      },
    },
  },
};
