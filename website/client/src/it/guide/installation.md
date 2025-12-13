# Installazione

## Utilizzo con npx (Nessuna installazione richiesta)

```bash
npx repomix@latest
```

## Installazione Globale

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

## Installazione con Docker

Scarica ed esegui l'immagine Docker:

```bash
# Directory corrente
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
# Directory specifica
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
# Repository remoto
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## Estensione VSCode

Esegui Repomix direttamente in VSCode con l'estensione della community [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner).

Funzionalità:
- Impacchetta qualsiasi cartella in pochi clic
- Scegli tra modalità file o contenuto per la copia
- Pulizia automatica dei file di output
- Compatibile con repomix.config.json

Installala dal [Marketplace VSCode](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner).

## Estensione Browser

Accedi istantaneamente a Repomix direttamente da qualsiasi repository GitHub! La nostra estensione Chrome aggiunge un pratico pulsante "Repomix" alle pagine dei repository GitHub.

![Estensione Browser Repomix](/images/docs/browser-extension.png)

### Installazione
- Estensione Chrome: [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Add-on Firefox: [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Funzionalità
- Accesso con un clic a Repomix per qualsiasi repository GitHub
- Altre funzionalità entusiasmanti in arrivo!

## Requisiti di Sistema

- Node.js: ≥ 20.0.0
- Git: Richiesto per l'elaborazione dei repository remoti

## Verifica

Dopo l'installazione, verifica che Repomix funzioni:

```bash
repomix --version
repomix --help
```
