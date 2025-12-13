# Форматы вывода

Repomix поддерживает четыре формата вывода:
- XML (по умолчанию)
- Markdown
- JSON
- Простой текст

## Формат XML

```bash
repomix --style xml
```

Формат XML оптимизирован для обработки ИИ:

```xml
This file is a merged representation of the entire codebase...

<file_summary>
(Метаданные и инструкции для ИИ)
</file_summary>

<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>

<files>
<file path="src/index.ts">
// Содержимое файла здесь
</file>
</files>

<git_logs>
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
</git_logs>
```

### Почему XML является форматом по умолчанию?
Repomix использует XML в качестве формата вывода по умолчанию на основе обширных исследований и тестирования. Это решение основано как на эмпирических данных, так и на практических соображениях для анализа кода с помощью ИИ.

Наш выбор XML в первую очередь обусловлен официальными рекомендациями крупных поставщиков ИИ:
- **Anthropic (Claude)**: Явно рекомендует XML-теги для структурирования промптов, заявляя, что «Claude подвергался таким промптам во время обучения» ([источник](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: Рекомендует структурированные форматы, включая XML, для сложных задач ([документация](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: Выступает за структурированные промпты в сложных сценариях ([анонс](https://x.com/OpenAIDevs/status/1890147300493914437), [cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Формат Markdown

```bash
repomix --style markdown
```

Markdown обеспечивает читаемое форматирование:

````markdown
This file is a merged representation of the entire codebase...

# File Summary
(Метаданные и инструкции для ИИ)

# Directory Structure
```
src/
index.ts
utils/
helper.ts
```

# Files

## File: src/index.ts
```typescript
// Содержимое файла здесь
```

# Git Logs
```
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
````

## Формат JSON

```bash
repomix --style json
```

Формат JSON предоставляет структурированный, программно доступный вывод с именами свойств в camelCase:

```json
{
  "fileSummary": {
    "generationHeader": "This file is a merged representation of the entire codebase, combined into a single document by Repomix.",
    "purpose": "This file contains a packed representation of the entire repository's contents...",
    "fileFormat": "The content is organized as follows...",
    "usageGuidelines": "- This file should be treated as read-only...",
    "notes": "- Some files may have been excluded based on .gitignore rules..."
  },
  "userProvidedHeader": "Custom header text if specified",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// Содержимое файла здесь",
    "src/utils.js": "// Содержимое файла здесь"
  },
  "instruction": "Custom instructions from instructionFilePath"
}
```

### Преимущества формата JSON

Формат JSON идеален для:
- **Программной обработки**: Легко парсить и манипулировать с помощью JSON-библиотек на любом языке программирования
- **Интеграции с API**: Прямое потребление веб-сервисами и приложениями
- **Совместимости с ИИ-инструментами**: Структурированный формат, оптимизированный для систем машинного обучения и ИИ
- **Анализа данных**: Простое извлечение конкретной информации с помощью таких инструментов, как `jq`

### Работа с JSON-выводом с помощью `jq`

Формат JSON упрощает программное извлечение конкретной информации. Вот типичные примеры:

#### Базовые операции с файлами
```bash
# Список всех путей файлов
cat repomix-output.json | jq -r '.files | keys[]'

# Подсчёт общего количества файлов
cat repomix-output.json | jq '.files | keys | length'

# Извлечение содержимого конкретного файла
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### Фильтрация и анализ файлов
```bash
# Поиск файлов по расширению
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# Получение файлов, содержащих определённый текст
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# Создание списка файлов с количеством символов
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) characters"'
```

#### Извлечение метаданных
```bash
# Извлечение структуры директорий
cat repomix-output.json | jq -r '.directoryStructure'

# Получение информации о сводке файлов
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# Извлечение пользовательского заголовка (если есть)
cat repomix-output.json | jq -r '.userProvidedHeader // "No header provided"'

# Получение пользовательских инструкций
cat repomix-output.json | jq -r '.instruction // "No instructions provided"'
```

#### Продвинутый анализ
```bash
# Поиск самых больших файлов по длине содержимого
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# Поиск файлов, содержащих определённые паттерны
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# Извлечение путей файлов, соответствующих нескольким расширениям
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## Формат простого текста

```bash
repomix --style plain
```

Структура вывода:
```text
This file is a merged representation of the entire codebase...

================
File Summary
================
(Метаданные и инструкции для ИИ)

================
Directory Structure
================
src/
  index.ts
  utils/
    helper.ts

================
Files
================

================
File: src/index.ts
================
// Содержимое файла здесь

================
Git Logs
================
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
## Использование с ИИ-моделями

Каждый формат хорошо работает с ИИ-моделями, но учитывайте:
- Используйте XML для Claude (лучшая точность парсинга)
- Используйте Markdown для общей читаемости
- Используйте JSON для программной обработки и интеграции с API
- Используйте простой текст для простоты и универсальной совместимости

## Настройка

Установите формат по умолчанию в `repomix.config.json`:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```
