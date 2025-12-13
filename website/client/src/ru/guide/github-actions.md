# Использование Repomix с GitHub Actions

Вы можете автоматизировать процесс упаковки вашей кодовой базы для анализа ИИ, интегрировав Repomix в рабочие процессы GitHub Actions. Это полезно для непрерывной интеграции (CI), код-ревью или подготовки репозитория для инструментов на основе LLM.

## Базовое использование

Добавьте следующий шаг в ваш workflow YAML для упаковки репозитория:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.xml
```

## Использование различных форматов вывода

Вы можете указать различные форматы вывода с помощью параметра `style` (по умолчанию `xml`):

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.md
    style: markdown
```

```yaml
- name: Pack repository with Repomix (JSON format)
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.json
    style: json
```

```yaml
- name: Pack repository with Repomix (Plain text format)
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    output: repomix-output.txt
    style: plain
```

## Упаковка нескольких директорий со сжатием

Вы можете указать несколько директорий, паттерны включения/исключения и включить умное сжатие:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src tests
    include: "**/*.ts,**/*.md"
    ignore: "**/*.test.ts"
    output: repomix-output.xml
    compress: true
```

## Загрузка вывода как артефакта

Чтобы сделать упакованный файл доступным для последующих шагов workflow или для скачивания, загрузите его как артефакт:

```yaml
- name: Pack repository with Repomix
  uses: yamadashy/repomix/.github/actions/repomix@main
  with:
    directories: src
    output: repomix-output.xml
    compress: true

- name: Upload Repomix output
  uses: actions/upload-artifact@v4
  with:
    name: repomix-output
    path: repomix-output.xml
```

## Входные параметры Action

| Имя               | Описание                                    | По умолчанию      |
|-------------------|---------------------------------------------|-------------------|
| `directories`     | Список директорий для упаковки через пробел | `.`               |
| `include`         | Glob-паттерны для включения через запятую   | `""`             |
| `ignore`          | Glob-паттерны для игнорирования через запятую | `""`             |
| `output`          | Путь к выходному файлу                      | `repomix-output.xml`     |
| `compress`        | Включить умное сжатие                       | `true`            |
| `style`           | Стиль вывода (xml, markdown, json, plain)   | `xml`             |
| `additional-args` | Дополнительные CLI-аргументы для repomix    | `""`             |
| `repomix-version` | Версия npm-пакета для установки             | `latest`          |

## Выходные параметры Action

| Имя           | Описание                           |
|---------------|------------------------------------|
| `output_file` | Путь к сгенерированному выходному файлу |

## Пример: Полный Workflow

Вот полный пример workflow GitHub Actions с использованием Repomix:

```yaml
name: Pack repository with Repomix

on:
  workflow_dispatch:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  pack-repo:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Pack repository with Repomix
        uses: yamadashy/repomix/.github/actions/repomix@main
        with:
          output: repomix-output.xml

      - name: Upload Repomix output
        uses: actions/upload-artifact@v4
        with:
          name: repomix-output.xml
          path: repomix-output.xml
          retention-days: 30
```

Смотрите [полный пример workflow](https://github.com/yamadashy/repomix/blob/main/.github/workflows/pack-repository.yml).
