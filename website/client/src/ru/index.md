---
layout: home
title: Repomix
description: "Упаковывайте локальные или удалённые репозитории в удобные для ИИ форматы XML, Markdown, JSON или простой текст для Claude, ChatGPT, Gemini, MCP и ревью кода."
titleTemplate: Упаковка кодовой базы в форматы, удобные для ИИ
aside: false
editLink: false

features:
  - icon: 🤖
    title: Оптимизировано для ИИ
    details: Форматирует вашу кодовую базу так, чтобы ИИ мог легко её понять и обработать.

  - icon: ⚙️
    title: Интеграция с Git
    details: Автоматически учитывает файлы .gitignore.

  - icon: 🛡️
    title: Фокус на безопасности
    details: Использует Secretlint для надёжных проверок безопасности и предотвращения включения конфиденциальной информации.

  - icon: 📊
    title: Подсчёт токенов
    details: Показывает количество токенов для каждого файла и всего репозитория — полезно для ограничений контекста LLM.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Номинация на Open Source Awards

Мы польщены! Repomix был номинирован в категории **Powered by AI** на [JSNation Open Source Awards 2025](https://osawards.com/javascript/).

Это было бы невозможно без всех вас, кто использует и поддерживает Repomix. Спасибо!

## Что такое Repomix?

Repomix — это мощный инструмент, который упаковывает всю вашу кодовую базу в один файл, удобный для ИИ. Работаете ли вы над код-ревью, рефакторингом или получаете помощь ИИ в вашем проекте — Repomix упрощает передачу контекста всего репозитория инструментам ИИ.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Быстрый старт

После создания упакованного файла (`repomix-output.xml`) с помощью Repomix вы можете отправить его ИИ-ассистенту (например, ChatGPT, Claude) с промптом вроде:

```text
Этот файл содержит все файлы репозитория, объединённые в один.
Я хочу провести рефакторинг кода, поэтому сначала проверьте его.
```

ИИ проанализирует всю вашу кодовую базу и предоставит комплексную информацию:

![Repomix File Usage 1](/images/docs/repomix-file-usage-1.png)

При обсуждении конкретных изменений ИИ может помочь с генерацией кода. С такими функциями, как Claude Artifacts, вы можете получить несколько взаимосвязанных файлов:

![Repomix File Usage 2](/images/docs/repomix-file-usage-2.png)

Успешного кодирования! 🚀

## Почему Repomix?

Сила Repomix заключается в способности работать с любым сервисом подписки, таким как ChatGPT, Claude, Gemini, Grok, не беспокоясь о расходах, при этом предоставляя полный контекст кодовой базы, что устраняет необходимость в исследовании файлов — делая анализ быстрее и зачастую точнее.

Имея всю кодовую базу в качестве контекста, Repomix позволяет выполнять широкий спектр задач, включая планирование реализации, исследование багов, проверки безопасности сторонних библиотек, генерацию документации и многое другое.

## Использование CLI-инструмента {#using-the-cli-tool}

Repomix можно использовать как инструмент командной строки с мощными функциями и опциями настройки.

**CLI-инструмент имеет доступ к приватным репозиториям**, так как использует ваш локально установленный git.

### Быстрый старт

Вы можете сразу попробовать Repomix в директории вашего проекта без установки:

```bash
npx repomix@latest
```

Или установите глобально для многократного использования:

```bash
# Установка с помощью npm
npm install -g repomix

# Альтернативно с помощью yarn
yarn global add repomix

# Альтернативно с помощью bun
bun add -g repomix

# Альтернативно с помощью Homebrew (macOS/Linux)
brew install repomix

# Затем запустите в любой директории проекта
repomix
```

Готово! Repomix создаст файл `repomix-output.xml` в текущей директории, содержащий весь ваш репозиторий в формате, удобном для ИИ.



### Использование

Для упаковки всего репозитория:

```bash
repomix
```

Для упаковки конкретной директории:

```bash
repomix path/to/directory
```

Для упаковки конкретных файлов или директорий с использованием [glob-паттернов](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Для исключения конкретных файлов или директорий:

```bash
repomix --ignore "**/*.log,tmp/"
```

Для упаковки удалённого репозитория:
```bash
# Используя сокращённый формат
npx repomix --remote yamadashy/repomix

# Используя полный URL (поддерживает ветки и конкретные пути)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Используя URL коммита
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

Для создания нового файла конфигурации (`repomix.config.json`):

```bash
repomix --init
```

После создания упакованного файла вы можете использовать его с генеративными ИИ-инструментами, такими как Claude, ChatGPT и Gemini.

#### Использование Docker

Вы также можете запустить Repomix с помощью Docker 🐳
Это полезно, если вы хотите запустить Repomix в изолированной среде или предпочитаете контейнеры.

Базовое использование (текущая директория):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Для упаковки конкретной директории:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Обработка удалённого репозитория с выводом в директорию `output`:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Форматы вывода

Выберите предпочтительный формат вывода:

```bash
# Формат XML (по умолчанию)
repomix --style xml

# Формат Markdown
repomix --style markdown

# Формат JSON
repomix --style json

# Простой текст
repomix --style plain
```

### Настройка

Создайте файл `repomix.config.json` для постоянных настроек:

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## Реальные сценарии использования

### [Рабочий процесс генерации кода с LLM](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

Разработчик делится тем, как он использует Repomix для извлечения контекста кода из существующих кодовых баз, а затем использует этот контекст с LLM, такими как Claude и Aider, для постепенных улучшений, код-ревью и автоматической генерации документации.

### [Создание пакетов знаний для LLM](https://lethain.com/competitive-advantage-author-llms/)

Авторы используют Repomix для упаковки своего письменного контента — блогов, документации и книг — в форматы, совместимые с LLM, что позволяет читателям взаимодействовать с их экспертизой через системы вопросов и ответов на основе ИИ.

[Узнать больше о сценариях использования →](/ru/guide/use-cases)

## Руководство для продвинутых пользователей

Repomix предлагает мощные функции для продвинутых сценариев использования. Вот некоторые важные руководства для опытных пользователей:

- **[MCP-сервер](/ru/guide/mcp-server)** — Интеграция Model Context Protocol для ИИ-ассистентов
- **[GitHub Actions](/ru/guide/github-actions)** — Автоматизация упаковки кодовой базы в CI/CD-процессах
- **[Сжатие кода](/ru/guide/code-compress)** — Интеллектуальное сжатие на основе Tree-sitter (~70% сокращение токенов)
- **[Использование как библиотеки](/ru/guide/development/using-repomix-as-a-library)** — Интеграция Repomix в ваши Node.js-приложения
- **[Пользовательские инструкции](/ru/guide/custom-instructions)** — Добавление собственных промптов и инструкций в вывод
- **[Функции безопасности](/ru/guide/security)** — Встроенная интеграция Secretlint и проверки безопасности
- **[Лучшие практики](/ru/guide/tips/best-practices)** — Оптимизация рабочих процессов с ИИ с помощью проверенных стратегий

### Дополнительные примеры
::: tip Нужна помощь? 💡
Ознакомьтесь с нашей комплексной документацией в [Руководстве](/ru/guide/) или изучите [репозиторий GitHub](https://github.com/yamadashy/repomix) для получения дополнительных примеров и исходного кода.
:::

</div>
