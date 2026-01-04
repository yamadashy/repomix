# Utiliser Repomix comme bibliothèque

En plus d'utiliser Repomix comme outil CLI, vous pouvez intégrer ses fonctionnalités directement dans vos applications Node.js.

## Installation

Installez Repomix comme dépendance dans votre projet :

```bash
npm install repomix
```

## Utilisation de base

La façon la plus simple d'utiliser Repomix est via la fonction `runCli`, qui fournit les mêmes fonctionnalités que l'interface en ligne de commande :

```javascript
import { runCli, type CliOptions } from 'repomix';

// Traiter le répertoire courant avec des options personnalisées
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

Le `result.packResult` contient des informations sur les fichiers traités, notamment :
- `totalFiles` : Nombre de fichiers traités
- `totalCharacters` : Nombre total de caractères
- `totalTokens` : Nombre total de tokens (utile pour les limites de contexte des LLM)
- `fileCharCounts` : Nombre de caractères par fichier
- `fileTokenCounts` : Nombre de tokens par fichier

## Traitement des dépôts distants

Vous pouvez cloner et traiter un dépôt distant :

```javascript
import { runCli, type CliOptions } from 'repomix';

// Cloner et traiter un dépôt GitHub
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;
  
  return await runCli(['.'], process.cwd(), options);
}
```

## Utilisation des composants principaux

Pour un contrôle plus précis, vous pouvez utiliser directement les API de bas niveau de Repomix :

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // Rechercher et collecter les fichiers
  const { filePaths } = await searchFiles(directory, { /* configuration */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* configuration */ });
  
  // Compter les tokens
  const tokenCounter = new TokenCounter('o200k_base');
  
  // Retourner les résultats d'analyse
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## Bundling

Lors du bundling de repomix avec des outils comme Rolldown ou esbuild, certaines dépendances doivent rester externes et les fichiers WASM doivent être copiés :

**Dépendances externes (ne peuvent pas être bundlées) :**
- `tinypool` - Lance des threads de travail en utilisant des chemins de fichiers
- `tiktoken` - Charge les fichiers WASM dynamiquement à l'exécution

**Fichiers WASM à copier :**
- `web-tree-sitter.wasm` → Même répertoire que le JS bundlé (requis pour la fonctionnalité de compression de code)
- Fichiers de langage Tree-sitter → Répertoire spécifié par la variable d'environnement `REPOMIX_WASM_DIR`

Pour un exemple fonctionnel, consultez [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs).

## Exemple concret

Le site web de Repomix ([repomix.com](https://repomix.com)) utilise Repomix comme bibliothèque pour traiter les dépôts distants. Vous pouvez consulter l'implémentation dans [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts). 
