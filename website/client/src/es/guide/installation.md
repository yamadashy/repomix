# Instalación

## Usando npx (no requiere instalación)

```bash
npx repomix@latest
```

## Instalación global

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

## Instalación con Docker

Extrae y ejecuta la imagen de Docker:

```bash
# Directorio actual
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix

# Directorio específico
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix ruta/al/directorio

# Repositorio remoto
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## Extensión de VSCode

Ejecuta Repomix directamente en VSCode con la extensión [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner) mantenida por la comunidad.

Características:
- Empaqueta cualquier carpeta con unos pocos clics
- Elige entre modo archivo o contenido para copiar
- Limpieza automática de archivos de salida
- Compatible con repomix.config.json

Instálala desde el [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner).

## Extensión del navegador

¡Obtén acceso instantáneo a Repomix directamente desde cualquier repositorio de GitHub! Nuestra extensión de Chrome añade un botón "Repomix" conveniente a las páginas de repositorio de GitHub.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### Instalación
- Extensión de Chrome: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Complemento de Firefox: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Características
- Acceso con un clic a Repomix para cualquier repositorio de GitHub
- ¡Más características emocionantes próximamente!

## Requisitos del sistema

- Node.js: ≥ 20.0.0
- Git: Requerido para el procesamiento de repositorios remotos

## Verificación

Después de la instalación, verifica que Repomix esté funcionando:

```bash
repomix --version
repomix --help
