---
title: FAQ et dépannage
description: Réponses aux questions fréquentes sur Repomix, les dépôts privés, le support C# et Python, les agents compatibles MCP, les formats de sortie, la réduction de tokens, la sécurité et les workflows IA.
---

# FAQ et dépannage

Cette page aide à choisir le bon workflow Repomix, réduire les sorties volumineuses et préparer un contexte de code pour les assistants IA.

## Questions fréquentes

### À quoi sert Repomix ?

Repomix empaquette un dépôt dans un seul fichier adapté à l'IA. Vous pouvez ainsi fournir à ChatGPT, Claude, Gemini ou d'autres assistants un contexte complet pour revue de code, investigation de bugs, refactorisation, documentation et onboarding.

### Repomix fonctionne-t-il avec les dépôts privés ?

Oui. Exécutez Repomix localement dans un checkout auquel votre machine a déjà accès :

```bash
repomix
```

Relisez le fichier généré avant de le partager avec un service IA externe.

### Peut-il traiter un dépôt GitHub public sans le cloner ?

Oui. Utilisez `--remote` avec la forme courte ou une URL complète :

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### Quel format de sortie choisir ?

Utilisez XML par défaut. Choisissez Markdown pour des conversations lisibles, JSON pour l'automatisation et texte brut pour une compatibilité maximale. Changez de format avec `--style` :

```bash
repomix --style markdown
repomix --style json
```

Consultez [Formats de sortie](/fr/guide/output).

## Réduire les tokens

### Le fichier généré est trop volumineux. Que faire ?

Réduisez le contexte :

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

Combinez les patterns include et ignore avec la compression de code pour les grands dépôts.

### Que fait `--compress` ?

`--compress` conserve la structure importante comme imports, exports, classes, fonctions et interfaces, tout en retirant beaucoup de détails d'implémentation. C'est utile pour une analyse d'architecture.

## Sécurité et confidentialité

### La CLI envoie-t-elle mon code ?

La CLI Repomix s'exécute localement et écrit un fichier de sortie sur votre machine. Le site web et l'extension navigateur ont des workflows différents ; consultez la [Politique de confidentialité](/fr/guide/privacy).

### Comment Repomix évite-t-il les secrets ?

Repomix utilise des contrôles basés sur Secretlint. Cela reste une protection supplémentaire : vérifiez toujours la sortie.

## Dépannage

### Pourquoi des fichiers manquent-ils dans la sortie ?

Repomix respecte `.gitignore`, les règles ignore par défaut et les patterns personnalisés. Vérifiez `repomix.config.json`, `--ignore` et vos règles git.

### Comment rendre la sortie reproductible en équipe ?

Créez et versionnez une configuration partagée :

```bash
repomix --init
```

## Questions fréquentes supplémentaires

### Repomix fonctionne-t-il avec C#, Python, Java, Go, Rust ou d'autres langages ?

Oui. Repomix lit les fichiers de votre projet et les formate pour les outils d'IA, il peut donc empaqueter des dépôts écrits dans n'importe quel langage. La CLI nécessite Node.js 20 ou plus récent. Certaines fonctions avancées, comme la compression basée sur Tree-sitter, dépendent du support de parser pour chaque langage.

### Puis-je utiliser Repomix avec Hermes Agent, OpenClaw ou d'autres agents compatibles MCP ?

Oui. Repomix peut s'exécuter comme serveur MCP :

```bash
npx -y repomix --mcp
```

Pour Hermes Agent, ajoutez Repomix comme serveur MCP stdio dans `~/.hermes/config.yaml` :

```yaml
mcp_servers:
  repomix:
    command: "npx"
    args: ["-y", "repomix", "--mcp"]
```

Pour OpenClaw ou d'autres agents compatibles MCP, utilisez le même command et les mêmes args là où l'agent permet de configurer un serveur MCP stdio externe. Si votre assistant prend en charge Agent Skills, vous pouvez aussi utiliser [Repomix Explorer Skill](/fr/guide/repomix-explorer-skill).

### Comment aider un assistant IA à comprendre une nouvelle bibliothèque ou un framework ?

Empaquetez le dépôt de la bibliothèque ou sa documentation, puis donnez la sortie à l'assistant IA comme référence :

```bash
npx repomix --remote owner/repo
npx repomix --remote owner/repo --include "docs/**,src/**"
```

Pour un usage répété, vous pouvez générer un répertoire Agent Skills réutilisable :

```bash
npx repomix --remote owner/repo --skill-generate library-reference
```

### Comment exclure CSS, tests, sorties de build ou autres fichiers bruyants ?

Utilisez `--ignore` pour une commande ponctuelle :

```bash
repomix --ignore "**/*.css,**/*.test.ts,dist/**,coverage/**"
```

Utilisez `--include` pour ne garder que certains chemins de code source ou de documentation :

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
```

### Existe-t-il une limite de taille de dépôt ?

La CLI n'a pas de limite fixe de taille de dépôt, mais les très grands dépôts peuvent être limités par la mémoire, la taille de fichier ou les limites d'upload et de contexte de l'outil d'IA. Pour les grands projets, commencez avec des include ciblés, inspectez les fichiers lourds en tokens et divisez la sortie si nécessaire :

```bash
repomix --token-count-tree 1000
repomix --split-output 1mb
```

### Pourquoi `--include` n'inclut-il pas les fichiers de `node_modules`, des dossiers de build ou des chemins ignorés ?

`--include` réduit les fichiers que Repomix essaie d'empaqueter, mais les règles d'ignore s'appliquent toujours. Des fichiers peuvent être exclus par `.gitignore`, `.ignore`, `.repomixignore`, les motifs par défaut intégrés ou `repomix.config.json`. Dans les cas avancés, `--no-gitignore` ou `--no-default-patterns` peuvent aider, mais utilisez-les prudemment car ils peuvent inclure des dépendances, des artefacts de build ou d'autres fichiers bruyants.

## Ressources liées

- [Utilisation de base](/fr/guide/usage)
- [Options de ligne de commande](/fr/guide/command-line-options)
- [Compression de code](/fr/guide/code-compress)
- [Sécurité](/fr/guide/security)
