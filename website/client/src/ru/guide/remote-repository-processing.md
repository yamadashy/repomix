# Обработка GitHub-репозиториев

## Базовое использование

Обработка публичных репозиториев:
```bash
# Использование полного URL
repomix --remote https://github.com/user/repo

# Использование сокращения GitHub
repomix --remote user/repo
```

## Выбор ветки и коммита

```bash
# Конкретная ветка
repomix --remote user/repo --remote-branch main

# Тег
repomix --remote user/repo --remote-branch v1.0.0

# Хэш коммита
repomix --remote user/repo --remote-branch 935b695
```

## Требования

- Git должен быть установлен
- Интернет-соединение
- Доступ на чтение репозитория

## Управление выводом

```bash
# Пользовательское расположение вывода
repomix --remote user/repo -o custom-output.xml

# В формате XML
repomix --remote user/repo --style xml

# Удаление комментариев
repomix --remote user/repo --remove-comments
```

## Использование Docker

```bash
# Обработка и вывод в текущую директорию
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# Вывод в конкретную директорию
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## Безопасность

В целях безопасности конфигурационные файлы (`repomix.config.*`) из удалённых репозиториев по умолчанию не загружаются. Это предотвращает выполнение кода из ненадёжных репозиториев через конфигурационные файлы вроде `repomix.config.ts`.

Ваша глобальная конфигурация и параметры CLI по-прежнему применяются.

Чтобы доверять конфигурации удалённого репозитория:

```bash
# С помощью флага CLI
repomix --remote user/repo --remote-trust-config

# С помощью переменной окружения
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

При использовании `--config` с `--remote` необходимо указать абсолютный путь:

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## Типичные проблемы

### Проблемы с доступом
- Убедитесь, что репозиторий публичный
- Проверьте установку Git
- Проверьте интернет-соединение

### Большие репозитории
- Используйте `--include` для выбора конкретных путей
- Включите `--remove-comments`
- Обрабатывайте ветки по отдельности
