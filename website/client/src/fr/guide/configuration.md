---
title: "Configuration"
description: "Configurez Repomix avec des fichiers JSON, JSONC, JSON5, JavaScript ou TypeScript, y compris les formats de sortie, motifs include et ignore, et options avancées."
---

# Configuration

Repomix peut être configuré à l'aide d'un fichier de configuration ou d'options en ligne de commande. Le fichier de configuration vous permet de personnaliser divers aspects du traitement et de la sortie de votre base de code.

## Formats de fichiers de configuration

Repomix prend en charge plusieurs formats de fichiers de configuration pour plus de flexibilité et de facilité d'utilisation.

Repomix recherchera automatiquement les fichiers de configuration dans l'ordre de priorité suivant :

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### Configuration JSON

Créez un fichier de configuration dans votre répertoire de projet :
```bash
repomix --init
```

Cela créera un fichier `repomix.config.json` avec les paramètres par défaut. Vous pouvez également créer un fichier de configuration global qui sera utilisé comme solution de repli lorsqu'aucune configuration locale n'est trouvée :

```bash
repomix --init --global
```

### Configuration TypeScript

Les fichiers de configuration TypeScript offrent la meilleure expérience de développement avec une vérification complète des types et un support IDE.

**Installation :**

Pour utiliser la configuration TypeScript ou JavaScript avec `defineConfig`, vous devez installer Repomix en tant que dépendance de développement :

```bash
npm install -D repomix
```

**Exemple :**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    filePath: 'output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
```

**Avantages :**
- ✅ Vérification complète des types TypeScript dans votre IDE
- ✅ Excellente autocomplétion et IntelliSense de l'IDE
- ✅ Utilisation de valeurs dynamiques (horodatages, variables d'environnement, etc.)

**Exemple de valeurs dynamiques :**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// Générer un nom de fichier basé sur l'horodatage
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### Configuration JavaScript

Les fichiers de configuration JavaScript fonctionnent de la même manière que TypeScript, en prenant en charge `defineConfig` et les valeurs dynamiques.

## Options de configuration

| Option                           | Description                                                                                                                  | Défaut                |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Taille maximale des fichiers à traiter en octets. Les fichiers plus grands seront ignorés. Utile pour exclure les fichiers binaires volumineux ou les fichiers de données | `50000000`            |
| `output.filePath`                | Nom du fichier de sortie. Prend en charge les formats XML, Markdown et texte brut                                            | `"repomix-output.xml"` |
| `output.style`                   | Style de sortie (`xml`, `markdown`, `json`, `plain`). Chaque format a ses propres avantages pour différents outils d'IA              | `"xml"`                |
| `output.filePathStyle`           | Façon dont les chemins de fichiers sont affichés dans la sortie (`target-relative` conserve les chemins relatifs à chaque racine cible, `cwd-relative` conserve les chemins relatifs au répertoire de travail courant) | `"target-relative"`    |
| `output.parsableStyle`           | Indique s'il faut échapper la sortie selon le schéma de style choisi. Permet une meilleure analyse mais peut augmenter le nombre de tokens | `false`                |
| `output.compress`                | Indique s'il faut effectuer une extraction intelligente du code à l'aide de Tree-sitter pour réduire le nombre de tokens tout en préservant la structure | `false`                |
| `output.patterns`                | Niveaux d'inclusion par fichier. Un tableau ordonné d'entrées `{ pattern, compress?, directoryStructureOnly? }` ; le premier motif glob correspondant l'emporte et remplace le réglage global `output.compress` pour ce fichier. Voir [Niveaux d'inclusion par fichier](#niveaux-dinclusion-par-fichier) | Non défini |
| `output.headerText`              | Texte personnalisé à inclure dans l'en-tête du fichier. Utile pour fournir du contexte ou des instructions aux outils d'IA   | `null`                 |
| `output.instructionFilePath`     | Chemin vers un fichier contenant des instructions personnalisées détaillées pour le traitement par l'IA                      | `null`                 |
| `output.fileSummary`             | Indique s'il faut inclure une section de résumé au début montrant le nombre de fichiers, les tailles et d'autres métriques  | `true`                 |
| `output.directoryStructure`      | Indique s'il faut inclure la structure des répertoires dans la sortie. Aide l'IA à comprendre l'organisation du projet      | `true`                 |
| `output.files`                   | Indique s'il faut inclure le contenu des fichiers dans la sortie. Mettre à false pour n'inclure que la structure et les métadonnées | `true`                 |
| `output.removeComments`          | Indique s'il faut supprimer les commentaires des types de fichiers pris en charge. Peut réduire le bruit et le nombre de tokens | `false`                |
| `output.removeEmptyLines`        | Indique s'il faut supprimer les lignes vides de la sortie pour réduire le nombre de tokens                                   | `false`                |
| `output.showLineNumbers`         | Indique s'il faut ajouter des numéros de ligne à chaque ligne. Utile pour référencer des parties spécifiques du code        | `false`                |
| `output.truncateBase64`          | Indique s'il faut tronquer les chaînes de données base64 longues (par exemple, les images) pour réduire le nombre de tokens | `false`                |
| `output.copyToClipboard`         | Indique s'il faut copier la sortie dans le presse-papiers système en plus de sauvegarder le fichier                         | `false`                |
| `output.splitOutput`             | Diviser la sortie en plusieurs fichiers numérotés par taille maximale par partie (ex., `1000000` pour ~1Mo). CLI accepte des tailles lisibles comme `500kb` ou `2mb`. Maintient chaque fichier sous la limite et évite de diviser les fichiers sources entre les parties | Non défini |
| `output.tokenBudget`             | Échouer avec un code de sortie non nul lorsque la sortie empaquetée dépasse ce nombre de jetons. Agit comme un garde-fou pour les limites de contexte CI/agent ; la sortie est tout de même générée | Non défini |
| `output.topFilesLength`          | Nombre de fichiers principaux à afficher dans le résumé. Si défini à 0, aucun résumé ne sera affiché                        | `5`                    |
| `output.includeEmptyDirectories` | Indique s'il faut inclure les répertoires vides dans la structure du dépôt                                                   | `false`                |
| `output.includeFullDirectoryStructure` | Lors de l'utilisation de motifs `include`, indique s'il faut afficher l'arbre de répertoires complet (en respectant les motifs ignore) tout en ne traitant que les fichiers inclus. Fournit un contexte complet du dépôt pour l'analyse IA | `false`                |
| `output.git.sortByChanges`       | Indique s'il faut trier les fichiers par nombre de modifications git. Les fichiers avec plus de modifications apparaissent en bas | `true`                 |
| `output.git.sortByChangesMaxCommits` | Nombre maximum de commits à analyser pour les modifications git. Limite la profondeur de l'historique pour les performances | `100`                  |
| `output.git.includeDiffs`        | Indique s'il faut inclure les différences git dans la sortie. Montre séparément les modifications de l'arborescence de travail et les modifications indexées | `false`                |
| `output.git.includeLogs`         | Indique s'il faut inclure les journaux git dans la sortie. Montre l'historique des commits avec les dates, les messages et les chemins de fichiers | `false`                |
| `output.git.includeLogsCount`    | Nombre de commits de journaux git récents à inclure dans la sortie                                                                          | `50`                   |
| `include`                        | Motifs des fichiers à inclure en utilisant les [motifs glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `ignore.useGitignore`            | Indique s'il faut utiliser les motifs du fichier `.gitignore` du projet                                                      | `true`                 |
| `ignore.useDotIgnore`            | Indique s'il faut utiliser les motifs du fichier `.ignore` du projet                                                         | `true`                 |
| `ignore.useDefaultPatterns`      | Indique s'il faut utiliser les motifs d'ignorance par défaut (node_modules, .git, etc.)                                    | `true`                 |
| `ignore.customPatterns`          | Motifs supplémentaires à ignorer en utilisant les [motifs glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `security.enableSecurityCheck`   | Indique s'il faut effectuer des vérifications de sécurité à l'aide de Secretlint pour détecter les informations sensibles   | `true`                 |
| `tokenCount.encoding`            | Encodage du comptage de tokens compatible OpenAI (par ex., `o200k_base` pour GPT-4o, `cl100k_base` pour GPT-4/3.5). Utilise [gpt-tokenizer](https://github.com/nicolo-ribaudo/gpt-tokenizer). | `"o200k_base"`         |

Le fichier de configuration prend en charge la syntaxe [JSON5](https://json5.org/), qui permet :
- Les commentaires (à la fois sur une seule ligne et sur plusieurs lignes)
- Les virgules finales dans les objets et les tableaux
- Les noms de propriétés non entre guillemets
- Une syntaxe de chaîne plus souple

## Validation de schéma

Vous pouvez activer la validation de schéma pour votre fichier de configuration en ajoutant la propriété `$schema` :

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

Cela fournit l'auto-complétion et la validation dans les éditeurs qui prennent en charge le schéma JSON.

## Exemple de fichier de configuration

Voici un exemple de fichier de configuration complet (`repomix.config.json`) :

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "filePathStyle": "target-relative",
    "parsableStyle": false,
    "compress": false,
    "headerText": "Informations d'en-tête personnalisées pour le fichier compressé.",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    // "patterns": [
    //   { "pattern": "docs/**/*", "compress": true },
    //   { "pattern": "website/**/*", "directoryStructureOnly": true }
    // ],
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // Les motifs peuvent également être spécifiés dans .repomixignore
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## Emplacements des fichiers de configuration

Repomix recherche les fichiers de configuration dans l'ordre suivant :
1. Fichier de configuration local dans le répertoire courant (ordre de priorité : TS > JS > JSON)
   - TypeScript : `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript : `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON : `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. Fichier de configuration global (ordre de priorité : TS > JS > JSON)
   - Windows :
     - TypeScript : `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript : `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON : `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux :
     - TypeScript : `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript : `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON : `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

Les options en ligne de commande ont la priorité sur les paramètres du fichier de configuration.

## Motifs d'inclusion

Repomix prend en charge la spécification de fichiers à inclure en utilisant des [motifs glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax). Cela permet une sélection de fichiers plus flexible et puissante :

- Utilisez `**/*.js` pour inclure tous les fichiers JavaScript dans n'importe quel répertoire
- Utilisez `src/**/*` pour inclure tous les fichiers dans le répertoire `src` et ses sous-répertoires
- Combinez plusieurs motifs comme `["src/**/*.js", "**/*.md"]` pour inclure les fichiers JavaScript dans `src` et tous les fichiers Markdown

Vous pouvez spécifier des motifs d'inclusion dans votre fichier de configuration :

```json
{
  "include": ["src/**/*", "tests/**/*.test.js"]
}
```

Ou utilisez l'option en ligne de commande `--include` pour un filtrage ponctuel.

## Motifs d'ignorance

Repomix offre plusieurs méthodes pour définir des motifs d'ignorance afin d'exclure des fichiers ou répertoires spécifiques pendant le processus d'empaquetage :

- **.gitignore** : Par défaut, les motifs listés dans les fichiers `.gitignore` de votre projet et `.git/info/exclude` sont utilisés. Ce comportement peut être contrôlé avec le paramètre `ignore.useGitignore` ou l'option CLI `--no-gitignore`.
- **.ignore** : Vous pouvez utiliser un fichier `.ignore` à la racine de votre projet, suivant le même format que `.gitignore`. Ce fichier est respecté par des outils comme ripgrep et the silver searcher, réduisant le besoin de maintenir plusieurs fichiers d'ignorance. Ce comportement peut être contrôlé avec le paramètre `ignore.useDotIgnore` ou l'option CLI `--no-dot-ignore`.
- **Motifs par défaut** : Repomix inclut une liste par défaut de fichiers et répertoires couramment exclus (par exemple, node_modules, .git, fichiers binaires). Cette fonctionnalité peut être contrôlée avec le paramètre `ignore.useDefaultPatterns` ou l'option CLI `--no-default-patterns`. Veuillez consulter [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) pour plus de détails.
- **.repomixignore** : Vous pouvez créer un fichier `.repomixignore` à la racine de votre projet pour définir des motifs d'ignorance spécifiques à Repomix. Ce fichier suit le même format que `.gitignore`.
- **Motifs personnalisés** : Des motifs d'ignorance supplémentaires peuvent être spécifiés en utilisant l'option `ignore.customPatterns` dans le fichier de configuration. Vous pouvez remplacer ce paramètre avec l'option en ligne de commande `-i, --ignore`.

**Ordre de priorité** (du plus élevé au plus bas) :

1. Motifs personnalisés (`ignore.customPatterns`)
2. Fichiers d'ignorance (`.repomixignore`, `.ignore`, `.gitignore`, et `.git/info/exclude`) :
   - Lorsqu'ils sont dans des répertoires imbriqués, les fichiers dans les répertoires plus profonds ont une priorité plus élevée
   - Lorsqu'ils sont dans le même répertoire, ces fichiers sont fusionnés sans ordre particulier
3. Motifs par défaut (si `ignore.useDefaultPatterns` est vrai et `--no-default-patterns` n'est pas utilisé)

Cette approche permet une configuration flexible de l'exclusion de fichiers en fonction des besoins de votre projet. Elle aide à optimiser la taille du fichier empaqueté généré en garantissant l'exclusion des fichiers sensibles à la sécurité et des gros fichiers binaires, tout en empêchant la fuite d'informations confidentielles.

**Remarque :** Les fichiers binaires ne sont pas inclus dans la sortie empaquetée par défaut, mais leurs chemins sont listés dans la section "Structure du dépôt" du fichier de sortie. Cela fournit un aperçu complet de la structure du dépôt tout en maintenant le fichier empaqueté efficace et basé sur du texte. Voir [Gestion des fichiers binaires](#gestion-des-fichiers-binaires) pour plus de détails.

Exemple de `.repomixignore` :
```text
# Répertoires de cache
.cache/
tmp/

# Sorties de build
dist/
build/

# Logs
*.log
```

## Motifs d'ignorance par défaut

Lorsque `ignore.useDefaultPatterns` est vrai, Repomix ignore automatiquement les motifs courants :
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Pour la liste complète, voir [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Gestion des fichiers binaires

Les fichiers binaires (tels que les images, les PDF, les binaires compilés, les archives, etc.) sont traités de manière spéciale pour maintenir une sortie efficace basée sur du texte :

- **Contenus de fichiers** : Les fichiers binaires **ne sont pas inclus** dans la sortie empaquetée pour garder le fichier basé sur du texte et efficace pour le traitement IA
- **Structure des répertoires** : Les chemins de fichiers binaires **sont listés** dans la section de structure des répertoires, fournissant un aperçu complet de votre dépôt

Cette approche garantit que vous obtenez une vue complète de la structure de votre dépôt tout en maintenant une sortie efficace basée sur du texte optimisée pour la consommation par l'IA.

**Exemple :**

Si votre dépôt contient `logo.png` et `app.jar` :
- Ils apparaîtront dans la section Structure des répertoires
- Leurs contenus ne seront pas inclus dans la section Fichiers

**Sortie de structure des répertoires :**
```
src/
  index.ts
  utils.ts
assets/
  logo.png
build/
  app.jar
```

De cette façon, les outils d'IA peuvent comprendre que ces fichiers binaires existent dans la structure de votre projet sans traiter leurs contenus binaires.

**Remarque :** Vous pouvez contrôler le seuil de taille maximale des fichiers en utilisant l'option de configuration `input.maxFileSize` (par défaut : 50MB). Les fichiers plus grands que cette limite seront entièrement ignorés.

## Fonctionnalités avancées

### Compression du code

La fonction de compression du code, activée avec `output.compress: true`, utilise [Tree-sitter](https://github.com/tree-sitter/tree-sitter) pour extraire intelligemment les structures de code essentielles tout en supprimant les détails d'implémentation. Cela aide à réduire le nombre de tokens tout en maintenant les informations structurelles importantes.

Avantages principaux :
- Réduit significativement le nombre de tokens
- Préserve les signatures des classes et des fonctions
- Maintient les imports et exports
- Conserve les définitions de types et les interfaces
- Supprime les corps de fonctions et les détails d'implémentation

Pour plus de détails et d'exemples, consultez le [Guide de compression du code](code-compress).

### Niveaux d'inclusion par fichier

Alors que `output.compress` applique un seul niveau à chaque fichier, `output.patterns` vous permet de contrôler le niveau de détail **par motif glob** depuis votre fichier de configuration. Chaque entrée cible des fichiers par motif glob (mis en correspondance de la même manière que `include`/`ignore`) et remplace le réglage global `output.compress` pour les fichiers correspondants.

```json5
{
  "output": {
    "compress": false, // la valeur par défaut globale sert de cas par défaut
    "patterns": [
      { "pattern": "docs/**/*", "compress": true },
      { "pattern": "website/**/*", "directoryStructureOnly": true }
    ]
  }
}
```

Chaque fichier est résolu vers l'un des trois niveaux :

- **Contenu complet** (par défaut) : le contenu complet du fichier est inclus.
- **Compressé** (`compress: true`) : le contenu passe par le même pipeline Tree-sitter que `output.compress`.
- **Structure de répertoires uniquement** (`directoryStructureOnly: true`) : le fichier est listé dans la structure des répertoires, mais son bloc de contenu est entièrement omis de la sortie.

Les règles :

- Les motifs sont évalués dans l'ordre du tableau et le **premier motif correspondant l'emporte** pour un fichier donné.
- Les indicateurs d'un motif correspondant remplacent le réglage global `output.compress`. Un motif qui correspond sans définir d'indicateur force le **contenu complet** pour ce fichier, ce qui est pratique pour mettre des fichiers sur liste blanche en dehors d'un `compress` global.
- `directoryStructureOnly` a la priorité sur `compress` lorsque les deux sont définis sur le même motif.
- Si aucun motif ne correspond, le comportement global s'applique (contenu complet, ou compressé lorsque `output.compress` vaut `true`).

Cette option est disponible uniquement dans le fichier de configuration ; il n'existe pas d'option CLI équivalente.

### Intégration Git

La configuration `output.git` fournit des fonctionnalités puissantes liées à Git :

- `sortByChanges` : Lorsque vrai, les fichiers sont triés par nombre de modifications Git (commits qui ont modifié le fichier). Les fichiers avec plus de modifications apparaissent en bas de la sortie. Cela aide à prioriser les fichiers plus activement développés. Par défaut : `true`
- `sortByChangesMaxCommits` : Le nombre maximum de commits à analyser lors du comptage des modifications de fichiers. Par défaut : `100`
- `includeDiffs` : Lorsque vrai, inclut les différences Git dans la sortie (inclut séparément les modifications de l'arborescence de travail et les modifications indexées). Cela permet au lecteur de voir les modifications en attente dans le dépôt. Par défaut : `false`
- `includeLogs` : Lorsque vrai, inclut l'historique des commits Git dans la sortie. Montre les dates des commits, les messages et les chemins de fichiers pour chaque commit. Cela aide l'IA à comprendre les modèles de développement et les relations entre fichiers. Par défaut : `false`
- `includeLogsCount` : Le nombre de commits récents à inclure dans les journaux git. Par défaut : `50`

Exemple de configuration :
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### Vérifications de sécurité

Lorsque `security.enableSecurityCheck` est activé, Repomix utilise [Secretlint](https://github.com/secretlint/secretlint) pour détecter les informations sensibles dans votre base de code avant de les inclure dans la sortie. Cela aide à prévenir l'exposition accidentelle de :

- Clés API
- Jetons d'accès
- Clés privées
- Mots de passe
- Autres informations d'identification sensibles

### Suppression des commentaires

Lorsque `output.removeComments` est défini à `true`, les commentaires sont supprimés des types de fichiers pris en charge pour réduire la taille de sortie et se concentrer sur le contenu essentiel du code. Cela peut être particulièrement utile lorsque :

- Vous travaillez avec du code fortement documenté
- Vous essayez de réduire le nombre de tokens
- Vous vous concentrez sur la structure et la logique du code

Pour les langages pris en charge et des exemples détaillés, consultez le [Guide de suppression des commentaires](comment-removal).

## Ressources associées

- [Options de ligne de commande](/fr/guide/command-line-options) - Référence complète de la CLI (les options CLI ont la priorité sur la configuration)
- [Formats de sortie](/fr/guide/output) - Détails sur chaque format de sortie
- [Sécurité](/fr/guide/security) - Comment Repomix détecte les informations sensibles
- [Compression de code](/fr/guide/code-compress) - Réduire le nombre de tokens avec Tree-sitter
- [Traitement des dépôts GitHub](/fr/guide/remote-repository-processing) - Options pour les dépôts distants
