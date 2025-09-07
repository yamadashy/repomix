# Configuration

Repomix peut être configuré à l'aide d'un fichier de configuration (`repomix.config.json`) ou d'options en ligne de commande. Le fichier de configuration vous permet de personnaliser divers aspects du traitement et de la sortie de votre base de code.

## Démarrage rapide

Créez un fichier de configuration dans votre répertoire de projet :
```bash
repomix --init
```

Cela créera un fichier `repomix.config.json` avec les paramètres par défaut. Vous pouvez également créer un fichier de configuration global qui sera utilisé comme solution de repli lorsqu'aucune configuration locale n'est trouvée :

```bash
repomix --init --global
```

## Options de configuration

| Option                           | Description                                                                                                                  | Défaut                |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Taille maximale des fichiers à traiter en octets. Les fichiers plus grands seront ignorés. Utile pour exclure les fichiers binaires volumineux ou les fichiers de données | `50000000`            |
| `output.filePath`                | Nom du fichier de sortie. Prend en charge les formats XML, Markdown et texte brut                                            | `"repomix-output.xml"` |
| `output.style`                   | Style de sortie (`xml`, `markdown`, `plain`). Chaque format a ses propres avantages pour différents outils d'IA              | `"xml"`                |
| `output.parsableStyle`           | Indique s'il faut échapper la sortie selon le schéma de style choisi. Permet une meilleure analyse mais peut augmenter le nombre de tokens | `false`                |
| `output.compress`                | Indique s'il faut effectuer une extraction intelligente du code à l'aide de Tree-sitter pour réduire le nombre de tokens tout en préservant la structure | `false`                |
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
| `output.topFilesLength`          | Nombre de fichiers principaux à afficher dans le résumé. Si défini à 0, aucun résumé ne sera affiché                        | `5`                    |
| `output.includeEmptyDirectories` | Indique s'il faut inclure les répertoires vides dans la structure du dépôt                                                   | `false`                |
| `output.git.sortByChanges`       | Indique s'il faut trier les fichiers par nombre de modifications git. Les fichiers avec plus de modifications apparaissent en bas | `true`                 |
| `output.git.sortByChangesMaxCommits` | Nombre maximum de commits à analyser pour les modifications git. Limite la profondeur de l'historique pour les performances | `100`                  |
| `output.git.includeDiffs`        | Indique s'il faut inclure les différences git dans la sortie. Montre séparément les modifications de l'arborescence de travail et les modifications indexées | `false`                |
| `output.git.includeLogs`         | Indique s'il faut inclure les journaux git dans la sortie. Montre l'historique des commits avec les dates, les messages et les chemins de fichiers | `false`                |
| `output.git.includeLogsCount`    | Nombre de commits de journaux git récents à inclure dans la sortie                                                                          | `50`                   |
| `include`                        | Motifs des fichiers à inclure en utilisant les [motifs glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `ignoreContent`                  | Patterns of files whose content should be ignored (using [glob patterns](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)); prefix with `!` to keep specific paths | `[]`                   |
| `ignore.useGitignore`            | Indique s'il faut utiliser les motifs du fichier `.gitignore` du projet                                                      | `true`                 |
| `ignore.useDefaultPatterns`      | Indique s'il faut utiliser les motifs d'ignorance par défaut (node_modules, .git, etc.)                                    | `true`                 |
| `ignore.customPatterns`          | Motifs supplémentaires à ignorer en utilisant les [motifs glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `security.enableSecurityCheck`   | Indique s'il faut effectuer des vérifications de sécurité à l'aide de Secretlint pour détecter les informations sensibles   | `true`                 |
| `tokenCount.encoding`            | Encodage du comptage des tokens utilisé par le tokenizer [tiktoken](https://github.com/openai/tiktoken) d'OpenAI. Utilisez `o200k_base` pour GPT-4o, `cl100k_base` pour GPT-4/3.5. Voir [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) pour plus de détails. | `"o200k_base"`         |

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
  "ignoreContent": ["components/**", "!components/slider/**"],
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
1. Fichier de configuration local (`repomix.config.json`) dans le répertoire courant
2. Fichier de configuration global :
   - Windows : `%LOCALAPPDATA%\Repomix\repomix.config.json`
   - macOS/Linux : `~/.config/repomix/repomix.config.json`

Les options en ligne de commande ont la priorité sur les paramètres du fichier de configuration.

## Motifs d'ignorance

Repomix propose plusieurs façons de spécifier quels fichiers doivent être ignorés. Les motifs sont traités dans l'ordre de priorité suivant :

1. Options CLI (`--ignore`)
2. Fichier `.repomixignore` dans le répertoire du projet
3. `.gitignore` et `.git/info/exclude` (si `ignore.useGitignore` est vrai)
4. Motifs par défaut (si `ignore.useDefaultPatterns` est vrai)

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
