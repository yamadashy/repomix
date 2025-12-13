# Генерация Agent Skills

Repomix может генерировать вывод в формате [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills), создавая структурированную директорию Skills, которая может использоваться как переиспользуемый справочник кодовой базы для ИИ-ассистентов.

Эта функция особенно мощная, когда вы хотите ссылаться на реализации из удалённых репозиториев. Генерируя Skills из open source проектов, вы можете легко попросить Claude ссылаться на конкретные паттерны или реализации при работе над вашим собственным кодом.

Вместо генерации одного упакованного файла, генерация Skills создаёт структурированную директорию с несколькими справочными файлами, оптимизированными для понимания ИИ и поиска grep-ом.

> [!NOTE]
> Это экспериментальная функция. Формат вывода и опции могут измениться в будущих версиях на основе отзывов пользователей.

## Базовое использование

Генерация Skills из локальной директории:

```bash
# Генерация Skills из текущей директории
repomix --skill-generate

# Генерация с пользовательским именем Skills
repomix --skill-generate my-project-reference

# Генерация из конкретной директории
repomix path/to/directory --skill-generate

# Генерация из удалённого репозитория
repomix --remote https://github.com/user/repo --skill-generate
```

## Выбор расположения Skills

При запуске команды Repomix предложит выбрать, куда сохранить Skills:

1. **Персональные Skills** (`~/.claude/skills/`) — Доступны во всех проектах на вашем компьютере
2. **Проектные Skills** (`.claude/skills/`) — Доступны вашей команде через git

Если директория Skills уже существует, вам будет предложено подтвердить перезапись.

> [!TIP]
> При генерации проектных Skills рассмотрите добавление их в `.gitignore`, чтобы избежать коммита больших файлов:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Генерируемая структура

Skills генерируются со следующей структурой:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Основные метаданные и документация Skills
└── references/
    ├── summary.md              # Назначение, формат и статистика
    ├── project-structure.md    # Дерево директорий с количеством строк
    ├── files.md                # Всё содержимое файлов (удобно для grep)
    └── tech-stack.md           # Языки, фреймворки, зависимости
```

### Описание файлов

#### SKILL.md

Основной файл Skills, содержащий:
- Имя Skills, описание и информацию о проекте
- Количество файлов, строк и токенов
- Обзор использования Skills
- Расположение файлов и объяснение формата
- Типичные сценарии использования и советы

#### references/summary.md

Содержит:
- **Назначение**: Объясняет, что это справочная кодовая база для потребления ИИ
- **Структура файлов**: Документирует, что находится в каждом справочном файле
- **Рекомендации по использованию**: Как эффективно использовать Skills
- **Статистика**: Разбивка по типу файла, языку и самым большим файлам

#### references/project-structure.md

Дерево директорий с количеством строк на файл для удобного обнаружения файлов:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

Всё содержимое файлов с заголовками подсветки синтаксиса, оптимизированное для поиска grep-ом:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

Автоматически определённый технологический стек из файлов зависимостей:
- **Языки**: TypeScript, JavaScript, Python и т.д.
- **Фреймворки**: React, Next.js, Express, Django и т.д.
- **Версии рантайма**: Node.js, Python, Go и т.д.
- **Пакетный менеджер**: npm, pnpm, poetry и т.д.
- **Зависимости**: Все прямые и dev-зависимости
- **Конфигурационные файлы**: Все обнаруженные файлы конфигурации

Определяется из файлов: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml` и т.д.

## Автоматически генерируемые имена Skills

Если имя не указано, Repomix автоматически генерирует его по следующему паттерну:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (нормализуется в kebab-case)
```

Имена Skills:
- Преобразуются в kebab-case (нижний регистр, разделены дефисами)
- Ограничены максимум 64 символами
- Защищены от обхода пути

## Интеграция с опциями Repomix

Генерация Skills учитывает все стандартные опции Repomix:

```bash
# Генерация Skills с фильтрацией файлов
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Генерация Skills со сжатием
repomix --skill-generate --compress

# Генерация Skills из удалённого репозитория
repomix --remote yamadashy/repomix --skill-generate

# Генерация Skills с конкретными опциями формата вывода
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Skills только с документацией

Используя `--include`, вы можете генерировать Skills, содержащие только документацию из GitHub-репозитория. Это полезно, когда вы хотите, чтобы Claude ссылался на конкретную документацию библиотеки или фреймворка при работе над вашим кодом:

```bash
# Документация Claude Code Action
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Документация Vite
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# Документация React
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Ограничения

Опция `--skill-generate` не может использоваться с:
- `--stdout` — Вывод Skills требует записи в файловую систему
- `--copy` — Вывод Skills — это директория, которую нельзя скопировать в буфер обмена

## Использование сгенерированных Skills

После генерации вы можете использовать Skills с Claude:

1. **Claude Code**: Skills автоматически доступны, если сохранены в `~/.claude/skills/` или `.claude/skills/`
2. **Claude Web**: Загрузите директорию Skills в Claude для анализа кодовой базы
3. **Командное использование**: Закоммитьте `.claude/skills/` в ваш репозиторий для доступа всей команды

## Пример рабочего процесса

### Создание персональной справочной библиотеки

```bash
# Клонировать и проанализировать интересный open source проект
repomix --remote facebook/react --skill-generate react-reference

# Skills сохранены в ~/.claude/skills/react-reference/
# Теперь вы можете ссылаться на кодовую базу React в любом разговоре с Claude
```

### Документация для команды проекта

```bash
# В директории вашего проекта
cd my-project

# Генерация Skills для вашей команды
repomix --skill-generate

# Выберите "Project Skills" при запросе
# Skills сохранены в .claude/skills/repomix-reference-my-project/

# Закоммитьте и поделитесь с командой
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## Связанные ресурсы

- [Плагины Claude Code](/ru/guide/claude-code-plugins) — Узнайте о плагинах Repomix для Claude Code
- [MCP-сервер](/ru/guide/mcp-server) — Альтернативный метод интеграции
- [Сжатие кода](/ru/guide/code-compress) — Уменьшение количества токенов со сжатием
- [Конфигурация](/ru/guide/configuration) — Настройка поведения Repomix
