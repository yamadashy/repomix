# Установка

## Использование npx (без установки)

```bash
npx repomix@latest
```

## Глобальная установка

::: code-group
```bash [npm]
npm install -g repomix
```
```bash [yarn]
yarn global add repomix
```
```bash [pnpm]
pnpm add -g repomix
```
```bash [bun]
bun add -g repomix
```
```bash [Homebrew]
brew install repomix
```
:::

## Установка Docker

Скачайте и запустите Docker-образ:

```bash
# Текущая директория
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# Конкретная директория
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory

# Удалённый репозиторий
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## Расширение VSCode

Запускайте Repomix прямо в VSCode с помощью расширения [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner), поддерживаемого сообществом.

Возможности:
- Упаковка любой папки несколькими кликами
- Выбор между режимом файла или контента для копирования
- Автоматическая очистка выходных файлов
- Работает с repomix.config.json

Установите из [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner).

## Расширение для браузера

Получите мгновенный доступ к Repomix прямо с любой страницы репозитория GitHub! Наше расширение для Chrome добавляет удобную кнопку «Repomix» на страницы репозиториев GitHub.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### Установка
- Расширение для Chrome: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Дополнение для Firefox: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Возможности
- Доступ к Repomix для любого репозитория GitHub одним кликом
- Скоро появятся новые функции!

## Системные требования

- Node.js: ≥ 20.0.0
- Git: Требуется для обработки удалённых репозиториев

## Проверка

После установки убедитесь, что Repomix работает:

```bash
repomix --version
repomix --help
```
