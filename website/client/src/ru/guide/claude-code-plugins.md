# Плагины Claude Code

Repomix предоставляет официальные плагины для [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), которые бесшовно интегрируются со средой разработки на основе ИИ. Эти плагины упрощают анализ и упаковку кодовых баз напрямую в Claude Code с использованием команд на естественном языке.

## Установка

### 1. Добавьте маркетплейс плагинов Repomix

Сначала добавьте маркетплейс плагинов Repomix в Claude Code:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. Установите плагины

Установите плагины с помощью следующих команд:

```text
# Установить плагин MCP-сервера (рекомендуемая основа)
/plugin install repomix-mcp@repomix

# Установить плагин команд (расширяет функциональность)
/plugin install repomix-commands@repomix

# Установить плагин исследователя репозиториев (анализ с помощью ИИ)
/plugin install repomix-explorer@repomix
```

::: tip Связь между плагинами
Плагин `repomix-mcp` рекомендуется как основа. Плагин `repomix-commands` предоставляет удобные слэш-команды, а `repomix-explorer` добавляет возможности анализа с помощью ИИ. Хотя вы можете устанавливать их независимо, использование всех трёх обеспечивает наиболее полный опыт.
:::

### Альтернатива: Интерактивная установка

Вы также можете использовать интерактивный установщик плагинов:

```text
/plugin
```

Это откроет интерактивный интерфейс, где вы можете просматривать и устанавливать доступные плагины.

## Доступные плагины

### 1. repomix-mcp (Плагин MCP-сервера)

Базовый плагин, предоставляющий анализ кодовой базы с помощью ИИ через интеграцию MCP-сервера.

**Возможности:**
- Упаковка локальных и удалённых репозиториев
- Поиск по упакованным выходным файлам
- Чтение файлов со встроенным сканированием безопасности ([Secretlint](https://github.com/secretlint/secretlint))
- Автоматическое сжатие Tree-sitter (~70% сокращение токенов)

### 2. repomix-commands (Плагин слэш-команд)

Предоставляет удобные слэш-команды для быстрых операций с поддержкой естественного языка.

**Доступные команды:**
- `/repomix-commands:pack-local` — Упаковка локальной кодовой базы с различными опциями
- `/repomix-commands:pack-remote` — Упаковка и анализ удалённых GitHub-репозиториев

### 3. repomix-explorer (Плагин ИИ-анализа)

ИИ-агент для анализа репозиториев, который интеллектуально исследует кодовые базы с помощью CLI Repomix.

**Возможности:**
- Исследование и анализ кодовой базы на естественном языке
- Интеллектуальное обнаружение паттернов и понимание структуры кода
- Инкрементальный анализ с использованием grep и целенаправленного чтения файлов
- Автоматическое управление контекстом для больших репозиториев

**Доступные команды:**
- `/repomix-explorer:explore-local` — Анализ локальной кодовой базы с помощью ИИ
- `/repomix-explorer:explore-remote` — Анализ удалённых GitHub-репозиториев с помощью ИИ

**Как это работает:**
1. Запускает `npx repomix@latest` для упаковки репозитория
2. Использует инструменты Grep и Read для эффективного поиска по выходному файлу
3. Предоставляет комплексный анализ без чрезмерного потребления контекста

## Примеры использования

### Упаковка локальной кодовой базы

Используйте команду `/repomix-commands:pack-local` с инструкциями на естественном языке:

```text
/repomix-commands:pack-local
Pack this project as markdown with compression
```

Другие примеры:
- "Pack the src directory only"
- "Pack TypeScript files with line numbers"
- "Generate output in JSON format"

### Упаковка удалённого репозитория

Используйте команду `/repomix-commands:pack-remote` для анализа GitHub-репозиториев:

```text
/repomix-commands:pack-remote yamadashy/repomix
Pack only TypeScript files from the yamadashy/repomix repository
```

Другие примеры:
- "Pack the main branch with compression"
- "Include only documentation files"
- "Pack specific directories"

### Исследование локальной кодовой базы с ИИ

Используйте команду `/repomix-explorer:explore-local` для анализа с помощью ИИ:

```text
/repomix-explorer:explore-local ./src
Find all authentication-related code
```

Другие примеры:
- "Analyze the structure of this project"
- "Show me the main components"
- "Find all API endpoints"

### Исследование удалённого репозитория с ИИ

Используйте команду `/repomix-explorer:explore-remote` для анализа GitHub-репозиториев:

```text
/repomix-explorer:explore-remote facebook/react
Show me the main component architecture
```

Другие примеры:
- "Find all React hooks in the repository"
- "Explain the project structure"
- "Where are error boundaries defined?"

## Связанные ресурсы

- [Документация MCP-сервера](/ru/guide/mcp-server) — Узнайте об основном MCP-сервере
- [Конфигурация](/ru/guide/configuration) — Настройте поведение Repomix
- [Безопасность](/ru/guide/security) — Понимание функций безопасности
- [Параметры командной строки](/ru/guide/command-line-options) — Доступные опции CLI

## Исходный код плагинов

Исходный код плагинов доступен в репозитории Repomix:

- [Маркетплейс плагинов](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [MCP-плагин](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [Плагин команд](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [Плагин исследователя репозиториев](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## Обратная связь и поддержка

Если вы столкнулись с проблемами или у вас есть предложения по плагинам Claude Code:

- [Создайте issue на GitHub](https://github.com/yamadashy/repomix/issues)
- [Присоединяйтесь к нашему Discord-сообществу](https://discord.gg/wNYzTwZFku)
- [Смотрите существующие обсуждения](https://github.com/yamadashy/repomix/discussions)
