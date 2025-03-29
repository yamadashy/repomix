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

## Outils MCP disponibles

En mode serveur MCP, Repomix fournit les outils suivants:

### pack_codebase

Cet outil package un répertoire de code local dans un fichier consolidé pour l'analyse par IA.

**Paramètres:**
- `directory`: (Requis) Chemin absolu vers le répertoire à packager
- `compress`: (Optionnel, par défaut: true) Effectuer ou non l'extraction intelligente de code pour réduire le nombre de tokens
- `includePatterns`: (Optionnel) Liste de motifs d'inclusion séparés par des virgules
- `ignorePatterns`: (Optionnel) Liste de motifs d'exclusion séparés par des virgules

**Exemple:**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### pack_remote_repository

Cet outil récupère, clone et package un dépôt GitHub dans un fichier consolidé pour l'analyse par IA.

**Paramètres:**
- `remote`: (Requis) URL du dépôt GitHub ou format utilisateur/dépôt (par exemple, yamadashy/repomix)
- `compress`: (Optionnel, par défaut: true) Effectuer ou non l'extraction intelligente de code pour réduire le nombre de tokens
- `includePatterns`: (Optionnel) Liste de motifs d'inclusion séparés par des virgules
- `ignorePatterns`: (Optionnel) Liste de motifs d'exclusion séparés par des virgules

**Exemple:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### file_system_read_file et file_system_read_directory

Le serveur MCP de Repomix fournit deux outils système de fichiers qui permettent aux assistants IA d'interagir en toute sécurité avec le système de fichiers local:

1. `file_system_read_file`
   - Lit le contenu des fichiers en utilisant des chemins absolus
   - Implémente la validation de sécurité avec [Secretlint](https://github.com/secretlint/secretlint)
   - Empêche l'accès aux fichiers contenant des informations sensibles
   - Renvoie du contenu formaté avec des messages d'erreur clairs pour les chemins invalides ou les problèmes de sécurité

2. `file_system_read_directory`
   - Liste le contenu des répertoires en utilisant des chemins absolus
   - Affiche les fichiers et répertoires avec des indicateurs clairs (`[FILE]` ou `[DIR]`)
   - Fournit une traversée sécurisée des répertoires avec une gestion appropriée des erreurs
   - Valide les chemins et s'assure qu'ils sont absolus

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

### Pour Claude Desktop

Modifiez le fichier `claude_desktop_config.json` avec une configuration similaire à celle de Cline.

## Avantages de l'utilisation de Repomix comme serveur MCP

L'utilisation de Repomix comme serveur MCP offre plusieurs avantages:

1. **Intégration directe**: Les assistants IA peuvent analyser directement votre base de code sans préparation manuelle des fichiers.
2. **Flux de travail efficace**: Simplifie le processus d'analyse du code en éliminant le besoin de générer et de télécharger manuellement des fichiers.
3. **Sortie cohérente**: Garantit que l'assistant IA reçoit la base de code dans un format cohérent et optimisé.
4. **Fonctionnalités avancées**: Exploite toutes les fonctionnalités de Repomix comme la compression de code, le comptage de tokens et les vérifications de sécurité.

Une fois configuré, votre assistant IA peut utiliser directement les capacités de Repomix pour analyser les bases de code, rendant les flux de travail d'analyse de code plus efficaces.