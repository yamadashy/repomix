---
title: "Repomix Explorer Skill (Agent Skills)"
description: "Установите agent skill Repomix Explorer для анализа локальных и удалённых кодовых баз с Claude Code и другими AI-ассистентами, поддерживающими формат Agent Skills."
---

# Repomix Explorer Skill (Agent Skills)

Repomix предоставляет готовый к использованию навык **Repomix Explorer**, который позволяет AI-помощникам анализировать и исследовать кодовые базы с помощью Repomix CLI.

Этот навык предназначен для Claude Code и других AI-ассистентов, поддерживающих формат Agent Skills.

## Быстрая Установка

Для Claude Code установите официальный плагин Repomix Explorer:

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

Плагин Claude Code предоставляет команды с пространством имён, например `/repomix-explorer:explore-local` и `/repomix-explorer:explore-remote`. Полную настройку смотрите в разделе [Плагины Claude Code](/ru/guide/claude-code-plugins).

Для Codex, Cursor, OpenClaw и других ассистентов, совместимых с Agent Skills, установите standalone skill через Skills CLI:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

Чтобы выбрать конкретного ассистента, передайте `--agent`:

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

Для Hermes Agent установите однофайловый skill с помощью нативной команды Hermes:

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/.claude/skills/repomix-explorer/SKILL.md
```

Если вы используете Hermes в основном для анализа репозиториев, настройка [MCP Server](/ru/guide/mcp-server) тоже подходит, потому что запускает Repomix напрямую как MCP-сервер.

## Что Он Делает

После установки вы можете анализировать кодовые базы с помощью инструкций на естественном языке.

#### Анализ удалённых репозиториев

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### Исследование локальных кодовых баз

```text
"What's in this project?
~/projects/my-app"
```

Это полезно не только для понимания кодовых баз, но и когда вы хотите реализовать функции, ссылаясь на другие ваши репозитории.

## Как Это Работает

Навык Repomix Explorer проводит AI-помощников через полный рабочий процесс:

1. **Выполнение команд repomix** - Упаковка репозиториев в AI-дружественный формат
2. **Анализ выходных файлов** - Использование поиска по шаблонам (grep) для нахождения релевантного кода
3. **Предоставление выводов** - Отчёт о структуре, метриках и практических рекомендациях

## Примеры Использования

### Понимание Новой Кодовой Базы

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

AI выполнит repomix, проанализирует вывод и предоставит структурированный обзор кодовой базы.

### Поиск Конкретных Шаблонов

```text
"Find all authentication-related code in this repository."
```

AI будет искать шаблоны аутентификации, категоризировать находки по файлам и объяснит, как реализована аутентификация.

### Ссылка на Собственные Проекты

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

AI проанализирует ваш другой репозиторий и поможет вам сослаться на ваши собственные реализации.

## Содержимое Навыка

Навык включает:

- **Распознавание намерения пользователя** - Понимает различные способы, которыми пользователи запрашивают анализ кодовой базы
- **Руководство по командам Repomix** - Знает, какие опции использовать (`--compress`, `--include` и т.д.)
- **Рабочий процесс анализа** - Структурированный подход к исследованию упакованного вывода
- **Лучшие практики** - Советы по эффективности, например, использовать grep перед чтением целых файлов

## Связанные Ресурсы

- [Генерация Agent Skills](/ru/guide/agent-skills-generation) - Создавайте собственные навыки из кодовых баз
- [Плагины Claude Code](/ru/guide/claude-code-plugins) - Плагины Repomix для Claude Code
- [MCP Сервер](/ru/guide/mcp-server) - Альтернативный метод интеграции
