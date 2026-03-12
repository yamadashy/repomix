import { type DefaultTheme, defineConfig } from 'vitepress';

export const configEs = defineConfig({
  lang: 'es',
  description: 'Empaqueta tu código en formatos amigables para IA',
  themeConfig: {
    nav: [
      { text: 'Guía', link: '/es/guide/', activeMatch: '^/es/guide/' },
      {
        text: 'Extensión de Chrome',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Unirse a Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/es/guide/': [
        {
          text: 'Introducción',
          items: [
            { text: 'Comenzar', link: '/es/guide/' },
            { text: 'Instalación', link: '/es/guide/installation' },
            { text: 'Uso Básico', link: '/es/guide/usage' },
            { text: 'Ejemplos de Prompts', link: '/es/guide/prompt-examples' },
            { text: 'Casos de Uso', link: '/es/guide/use-cases' },
          ],
        },
        {
          text: 'Guía',
          items: [
            { text: 'Formatos de Salida', link: '/es/guide/output' },
            { text: 'Opciones de Línea de Comandos', link: '/es/guide/command-line-options' },
            { text: 'Configuración', link: '/es/guide/configuration' },
            { text: 'Instrucciones Personalizadas', link: '/es/guide/custom-instructions' },
            { text: 'Procesamiento de Repositorios de GitHub', link: '/es/guide/remote-repository-processing' },
            { text: 'Eliminación de Comentarios', link: '/es/guide/comment-removal' },
            { text: 'Compresión de Código', link: '/es/guide/code-compress' },
            { text: 'Seguridad', link: '/es/guide/security' },
          ],
        },
        {
          text: 'Avanzado',
          items: [
            { text: 'Servidor MCP', link: '/es/guide/mcp-server' },
            { text: 'Plugins de Claude Code', link: '/es/guide/claude-code-plugins' },
            { text: 'Generación de Agent Skills', link: '/es/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/es/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/es/guide/github-actions' },
            { text: 'Usar Repomix como Biblioteca', link: '/es/guide/development/using-repomix-as-a-library' },
            { text: 'Consejos para Desarrollo Asistido por IA', link: '/es/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Comunidad',
          items: [
            { text: 'Proyectos de la Comunidad', link: '/es/guide/community-projects' },
            { text: 'Contribuir a Repomix', link: '/es/guide/development/' },
            { text: 'Patrocinadores', link: '/es/guide/sponsors' },
            { text: 'Privacy Policy', link: '/es/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configEsSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  es: {
    translations: {
      button: {
        buttonText: 'Buscar',
        buttonAriaLabel: 'Buscar',
      },
      modal: {
        noResultsText: 'No se encontraron resultados',
        resetButtonTitle: 'Reiniciar búsqueda',
        backButtonTitle: 'Atrás',
        displayDetails: 'Mostrar detalles',
        footer: {
          selectText: 'Seleccionar',
          navigateText: 'Navegar',
          closeText: 'Cerrar',
        },
      },
    },
  },
};
