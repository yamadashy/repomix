import { type DefaultTheme, defineConfig } from 'vitepress';

export const configRu = defineConfig({
  lang: 'ru',
  description: 'Упаковка кодовой базы в форматы, удобные для ИИ',
  themeConfig: {
    nav: [
      { text: 'Руководство', link: '/ru/guide/', activeMatch: '^/ru/guide/' },
      {
        text: 'Расширение для Chrome',
        link: 'https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa',
      },
      { text: 'Присоединиться к Discord', link: 'https://discord.gg/wNYzTwZFku' },
    ],
    sidebar: {
      '/ru/guide/': [
        {
          text: 'Введение',
          items: [
            { text: 'Начало работы', link: '/ru/guide/' },
            { text: 'Установка', link: '/ru/guide/installation' },
            { text: 'Базовое использование', link: '/ru/guide/usage' },
            { text: 'Примеры промптов', link: '/ru/guide/prompt-examples' },
            { text: 'Сценарии использования', link: '/ru/guide/use-cases' },
          ],
        },
        {
          text: 'Руководство',
          items: [
            { text: 'Форматы вывода', link: '/ru/guide/output' },
            { text: 'Параметры командной строки', link: '/ru/guide/command-line-options' },
            { text: 'Конфигурация', link: '/ru/guide/configuration' },
            { text: 'Пользовательские инструкции', link: '/ru/guide/custom-instructions' },
            { text: 'Обработка GitHub-репозиториев', link: '/ru/guide/remote-repository-processing' },
            { text: 'Удаление комментариев', link: '/ru/guide/comment-removal' },
            { text: 'Сжатие кода', link: '/ru/guide/code-compress' },
            { text: 'Безопасность', link: '/ru/guide/security' },
          ],
        },
        {
          text: 'Продвинутое',
          items: [
            { text: 'MCP-сервер', link: '/ru/guide/mcp-server' },
            { text: 'Плагины Claude Code', link: '/ru/guide/claude-code-plugins' },
            { text: 'Генерация Agent Skills', link: '/ru/guide/agent-skills-generation' },
            { text: 'Repomix Explorer Skill', link: '/ru/guide/repomix-explorer-skill' },
            { text: 'GitHub Actions', link: '/ru/guide/github-actions' },
            { text: 'Использование Repomix как библиотеки', link: '/ru/guide/development/using-repomix-as-a-library' },
            { text: 'Лучшие практики разработки с ИИ', link: '/ru/guide/tips/best-practices' },
          ],
        },
        {
          text: 'Сообщество',
          items: [
            { text: 'Проекты сообщества', link: '/ru/guide/community-projects' },
            { text: 'Участие в разработке Repomix', link: '/ru/guide/development/' },
            { text: 'Спонсоры', link: '/ru/guide/sponsors' },
            { text: 'Политика конфиденциальности', link: '/ru/guide/privacy' },
          ],
        },
      ],
    },
  },
});

export const configRuSearch: DefaultTheme.LocalSearchOptions['locales'] = {
  ru: {
    translations: {
      button: {
        buttonText: 'Поиск',
        buttonAriaLabel: 'Поиск',
      },
      modal: {
        noResultsText: 'Результаты не найдены',
        resetButtonTitle: 'Сбросить поиск',
        backButtonTitle: 'Назад',
        displayDetails: 'Показать подробности',
        footer: {
          selectText: 'Выбрать',
          navigateText: 'Навигация',
          closeText: 'Закрыть',
        },
      },
    },
  },
};
