# Serveur MCP

Repomix prend en charge le [Model Context Protocol (MCP)](https://modelcontextprotocol.io), permettant aux assistants IA d'interagir directement avec votre base de code. Lorsqu'il est exécuté en tant que serveur MCP, Repomix fournit des outils permettant aux assistants IA de packager des dépôts locaux ou distants pour analyse sans nécessiter de préparation manuelle des fichiers.

> [!NOTE]  
> Il s'agit d'une fonctionnalité expérimentale que nous améliorerons activement en fonction des retours utilisateurs et de l'usage réel

## Exécuter Repomix comme serveur MCP

Pour exécuter Repomix en tant que serveur MCP, utilisez l'option `--mcp`:
```bash
repomix --mcp
```

Cela démarre Repomix en mode serveur MCP, le rendant disponible pour les assistants IA qui prennent en charge le Model Context Protocol.

## Configuration des serveurs MCP

Pour utiliser Repomix comme serveur MCP avec des assistants IA comme Claude, vous devez configurer les paramètres MCP:

### Pour VS Code

Vous pouvez installer le serveur MCP Repomix dans VS Code en utilisant l'une de ces méthodes:

1. **Utilisation du badge d'installation :**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Utilisation de la ligne de commande :**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  Pour VS Code Insiders :
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Pour Cline (extension VS Code)

Modifiez le fichier `cline_mcp_settings.json`:
```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Pour Cursor

Dans Cursor, ajoutez un nouveau serveur MCP depuis `Cursor Settings` > `MCP` > `+ Add new global MCP server` avec une configuration similaire à celle de Cline.

### Pour Claude Desktop

Modifiez le fichier `claude_desktop_config.json` avec une configuration similaire à celle de Cline.

### Pour Claude Code

Pour configurer Repomix comme serveur MCP dans [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), utilisez la commande suivante:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

Alternativement, vous pouvez utiliser les **plugins officiels Repomix** pour une expérience plus pratique. Les plugins fournissent des commandes en langage naturel et une configuration plus facile. Consultez la documentation [Plugins Claude Code](/fr/guide/claude-code-plugins) pour plus de détails.

### Utilisation de Docker au lieu de npx

Au lieu d'utiliser npx, vous pouvez utiliser Docker pour exécuter Repomix en tant que serveur MCP:

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## Outils MCP disponibles

En mode serveur MCP, Repomix fournit les outils suivants:

### pack_codebase

Cet outil package un répertoire de code local dans un fichier XML pour l'analyse par IA. Il analyse la structure de la base de code, extrait le contenu de code pertinent et génère un rapport complet incluant les métriques, l'arbre des fichiers et le contenu de code formaté.

**Paramètres :**

| Paramètre | Requis | Par défaut | Description |
|-----------|--------|------------|-------------|
| `directory` | Oui | — | Chemin absolu vers le répertoire à packager |
| `compress` | Non | `false` | Active la compression Tree-sitter pour extraire les signatures de code essentielles et la structure tout en supprimant les détails d'implémentation. Réduit l'utilisation de tokens d'environ 70% tout en préservant la signification sémantique. Généralement non nécessaire car `grep_repomix_output` permet la récupération incrémentale de contenu. |
| `includePatterns` | Non | — | Fichiers à inclure avec des motifs fast-glob. Séparés par des virgules (ex : `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | Non | — | Fichiers supplémentaires à exclure avec des motifs fast-glob. Séparés par des virgules (ex : `"test/**,*.spec.js"`). Complète `.gitignore` et les exclusions intégrées. |
| `topFilesLength` | Non | `10` | Nombre de plus gros fichiers par taille à afficher dans le résumé des métriques |

**Exemple :**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

Cet outil récupère, clone et package un dépôt GitHub dans un fichier XML pour l'analyse par IA. Il clone automatiquement le dépôt distant, analyse sa structure et génère un rapport complet.

**Paramètres :**

| Paramètre | Requis | Par défaut | Description |
|-----------|--------|------------|-------------|
| `remote` | Oui | — | URL du dépôt GitHub ou format `utilisateur/dépôt` (ex : `"yamadashy/repomix"`, `"https://github.com/user/repo"` ou `"https://github.com/user/repo/tree/branch"`) |
| `compress` | Non | `false` | Active la compression Tree-sitter pour extraire les signatures de code essentielles et la structure tout en supprimant les détails d'implémentation. Réduit l'utilisation de tokens d'environ 70% tout en préservant la signification sémantique. |
| `includePatterns` | Non | — | Fichiers à inclure avec des motifs fast-glob. Séparés par des virgules (ex : `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | Non | — | Fichiers supplémentaires à exclure avec des motifs fast-glob. Séparés par des virgules (ex : `"test/**,*.spec.js"`). Complète `.gitignore` et les exclusions intégrées. |
| `topFilesLength` | Non | `10` | Nombre de plus gros fichiers par taille à afficher dans le résumé des métriques |

**Exemple:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### read_repomix_output

Cet outil lit le contenu d'un fichier de sortie généré par Repomix. Il prend en charge la lecture partielle avec spécification de plage de lignes pour les gros fichiers. Cet outil est conçu pour les environnements où l'accès direct au système de fichiers est limité.

**Paramètres :**

| Paramètre | Requis | Par défaut | Description |
|-----------|--------|------------|-------------|
| `outputId` | Oui | — | ID du fichier de sortie Repomix à lire |
| `startLine` | Non | Début du fichier | Numéro de ligne de début (basé sur 1, inclusif) |
| `endLine` | Non | Fin du fichier | Numéro de ligne de fin (basé sur 1, inclusif) |

**Fonctionnalités :**
- Conçu spécifiquement pour les environnements basés sur le web ou les applications en bac à sable
- Récupère le contenu des sorties générées précédemment en utilisant leur ID
- Fournit un accès sécurisé à la base de code packagée sans nécessiter d'accès au système de fichiers
- Prend en charge la lecture partielle pour les gros fichiers

**Exemple:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

Cet outil recherche des motifs dans un fichier de sortie Repomix en utilisant une fonctionnalité similaire à grep avec la syntaxe JavaScript RegExp. Il retourne les lignes correspondantes avec des lignes de contexte optionnelles autour des correspondances.

**Paramètres :**

| Paramètre | Requis | Par défaut | Description |
|-----------|--------|------------|-------------|
| `outputId` | Oui | — | ID du fichier de sortie Repomix à rechercher |
| `pattern` | Oui | — | Motif de recherche (syntaxe JavaScript RegExp) |
| `contextLines` | Non | `0` | Nombre de lignes de contexte avant et après chaque correspondance. Remplacé par `beforeLines`/`afterLines` si spécifié. |
| `beforeLines` | Non | — | Lignes à afficher avant chaque correspondance (comme `grep -B`). Priorité sur `contextLines`. |
| `afterLines` | Non | — | Lignes à afficher après chaque correspondance (comme `grep -A`). Priorité sur `contextLines`. |
| `ignoreCase` | Non | `false` | Effectuer une correspondance insensible à la casse |

**Fonctionnalités :**
- Utilise la syntaxe JavaScript RegExp pour une correspondance de motifs puissante
- Prend en charge les lignes de contexte pour une meilleure compréhension des correspondances
- Permet un contrôle séparé des lignes de contexte avant/après
- Options de recherche sensible et insensible à la casse

**Exemple:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file et file_system_read_directory

Le serveur MCP de Repomix fournit deux outils système de fichiers qui permettent aux assistants IA d'interagir en toute sécurité avec le système de fichiers local:

1. `file_system_read_file`
  - Lit le contenu des fichiers du système de fichiers local en utilisant des chemins absolus
  - Inclut une validation de sécurité intégrée pour détecter et prévenir l'accès aux fichiers contenant des informations sensibles
  - Implémente la validation de sécurité avec [Secretlint](https://github.com/secretlint/secretlint)
  - Empêche l'accès aux fichiers contenant des informations sensibles (clés API, mots de passe, secrets)
  - Valide les chemins absolus pour prévenir les attaques par traversée de répertoire
  - Renvoie des messages d'erreur clairs pour les chemins invalides et les problèmes de sécurité

2. `file_system_read_directory`
  - Liste le contenu d'un répertoire en utilisant un chemin absolu
  - Renvoie une liste formatée montrant les fichiers et sous-répertoires avec des indicateurs clairs
  - Affiche les fichiers et répertoires avec des indicateurs clairs (`[FILE]` ou `[DIR]`)
  - Fournit une traversée sécurisée des répertoires avec une gestion appropriée des erreurs
  - Valide les chemins et s'assure qu'ils sont absolus
  - Utile pour explorer la structure du projet et comprendre l'organisation de la base de code

Les deux outils intègrent des mesures de sécurité robustes:
- Validation des chemins absolus pour prévenir les attaques par traversée de répertoire
- Vérifications des permissions pour assurer des droits d'accès appropriés
- Intégration avec Secretlint pour la détection d'informations sensibles
- Messages d'erreur clairs pour un meilleur débogage et une meilleure sensibilisation à la sécurité

**Exemple:**
```typescript
// Lecture d'un fichier
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Liste du contenu d'un répertoire
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

Ces outils sont particulièrement utiles lorsque les assistants IA doivent:
- Analyser des fichiers spécifiques dans la base de code
- Naviguer dans les structures de répertoires
- Vérifier l'existence et l'accessibilité des fichiers
- Assurer des opérations sécurisées sur le système de fichiers

## Avantages de l'utilisation de Repomix comme serveur MCP

L'utilisation de Repomix comme serveur MCP offre plusieurs avantages:

1. **Intégration directe**: Les assistants IA peuvent analyser directement votre base de code sans préparation manuelle des fichiers.
2. **Flux de travail efficace**: Simplifie le processus d'analyse du code en éliminant le besoin de générer et de télécharger manuellement des fichiers.
3. **Sortie cohérente**: Garantit que l'assistant IA reçoit la base de code dans un format cohérent et optimisé.
4. **Fonctionnalités avancées**: Exploite toutes les fonctionnalités de Repomix comme la compression de code, le comptage de tokens et les vérifications de sécurité.

Une fois configuré, votre assistant IA peut utiliser directement les capacités de Repomix pour analyser les bases de code, rendant les flux de travail d'analyse de code plus efficaces.

## Ressources associées

- [Plugins Claude Code](/fr/guide/claude-code-plugins) - Intégration pratique de plugins pour Claude Code
- [Configuration](/fr/guide/configuration) - Personnaliser le comportement de Repomix
- [Options de ligne de commande](/fr/guide/command-line-options) - Référence complète de la CLI
- [Formats de sortie](/fr/guide/output) - Découvrir les formats de sortie disponibles
