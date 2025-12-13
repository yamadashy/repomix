# Installation

## Utilisation avec npx (Sans installation requise)

```bash
npx repomix@latest
```

## Installation globale

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

## Installation avec Docker

Téléchargez et exécutez l'image Docker:

```bash
# Répertoire courant
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
# Répertoire spécifique
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
# Dépôt distant
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote yamadashy/repomix
```

## Extension VSCode

Exécutez Repomix directement dans VSCode avec l'extension communautaire [Repomix Runner](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner).

Fonctionnalités:
- Empaquetez n'importe quel dossier en quelques clics
- Choisissez entre le mode fichier ou contenu pour la copie
- Nettoyage automatique des fichiers de sortie
- Compatible avec repomix.config.json

Installez-la depuis le [Marketplace VSCode](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner).

## Extension de navigateur

Accédez instantanément à Repomix directement depuis n'importe quel dépôt GitHub ! Notre extension Chrome ajoute un bouton "Repomix" pratique aux pages de dépôt GitHub.

![Repomix Browser Extension](/images/docs/browser-extension.png)

### Installation
- Extension Chrome : [Repomix - Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa)
- Module Firefox : [Repomix - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/repomix/)

### Fonctionnalités
- Accès en un clic à Repomix pour n'importe quel dépôt GitHub
- D'autres fonctionnalités passionnantes arrivent bientôt !

## Configuration requise

- Node.js: ≥ 20.0.0
- Git: Requis pour le traitement des dépôts distants

## Vérification

Après l'installation, vérifiez que Repomix fonctionne:

```bash
repomix --version
repomix --help
```
