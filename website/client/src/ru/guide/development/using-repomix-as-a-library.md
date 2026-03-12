# Использование Repomix как библиотеки

Помимо использования Repomix как CLI-инструмента, вы можете интегрировать его функциональность напрямую в ваши Node.js-приложения.

## Установка

Установите Repomix как зависимость в вашем проекте:

```bash
npm install repomix
```

## Базовое использование

Самый простой способ использовать Repomix — через функцию `runCli`, которая предоставляет ту же функциональность, что и интерфейс командной строки:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Обработка текущей директории с пользовательскими опциями
async function packProject() {
  const options = {
    output: 'output.xml',
    style: 'xml',
    compress: true,
    quiet: true
  } as CliOptions;

  const result = await runCli(['.'], process.cwd(), options);
  return result.packResult;
}
```

`result.packResult` содержит информацию об обработанных файлах, включая:
- `totalFiles`: Количество обработанных файлов
- `totalCharacters`: Общее количество символов
- `totalTokens`: Общее количество токенов (полезно для ограничений контекста LLM)
- `fileCharCounts`: Количество символов по файлам
- `fileTokenCounts`: Количество токенов по файлам

## Обработка удалённых репозиториев

Вы можете клонировать и обработать удалённый репозиторий:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Клонировать и обработать GitHub-репозиторий
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;

  return await runCli(['.'], process.cwd(), options);
}
```

## Использование базовых компонентов

Для большего контроля вы можете использовать низкоуровневые API Repomix напрямую:

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // Найти и собрать файлы
  const { filePaths } = await searchFiles(directory, { /* config */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* config */ });

  // Подсчитать токены
  const tokenCounter = new TokenCounter('o200k_base');

  // Вернуть результаты анализа
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## Бандлинг

При бандлинге repomix с помощью инструментов вроде Rolldown или esbuild, некоторые зависимости должны оставаться внешними, и WASM-файлы необходимо скопировать:

**Внешние зависимости (не могут быть забандлены):**
- `tinypool` - Запускает рабочие потоки, используя пути к файлам
- `tiktoken` - Динамически загружает WASM-файлы во время выполнения

**WASM-файлы для копирования:**
- `web-tree-sitter.wasm` → В ту же директорию, что и забандленный JS (требуется для функции сжатия кода)
- Языковые файлы Tree-sitter → Директория, указанная переменной окружения `REPOMIX_WASM_DIR`

Рабочий пример можно посмотреть в [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs).

## Реальный пример

Сайт Repomix ([repomix.com](https://repomix.com)) использует Repomix как библиотеку для обработки удалённых репозиториев. Вы можете увидеть реализацию в [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts).
