# Repomix Explorer Skill (Agent Skills)

Repomix fournit un skill **Repomix Explorer** prêt à l'emploi qui permet aux assistants de codage IA d'analyser et d'explorer des bases de code en utilisant Repomix CLI.

Ce skill est conçu pour fonctionner avec divers outils IA, notamment Claude Code, Cursor, Codex, GitHub Copilot et plus encore.

## Installation Rapide

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

Cette commande installe le skill dans le répertoire des skills de votre assistant IA (ex. `.claude/skills/`), le rendant immédiatement disponible.

## Ce Qu'il Fait

Une fois installé, vous pouvez analyser des bases de code avec des instructions en langage naturel.

#### Analyser des dépôts distants

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### Explorer des bases de code locales

```text
"What's in this project?
~/projects/my-app"
```

C'est utile non seulement pour comprendre des bases de code, mais aussi lorsque vous souhaitez implémenter des fonctionnalités en référençant vos autres dépôts.

## Comment Ça Marche

Le skill Repomix Explorer guide les assistants IA à travers le workflow complet:

1. **Exécuter les commandes repomix** - Empaqueter les dépôts dans un format compatible IA
2. **Analyser les fichiers de sortie** - Utiliser la recherche de motifs (grep) pour trouver le code pertinent
3. **Fournir des insights** - Rapporter la structure, les métriques et les recommandations actionnables

## Exemples de Cas d'Utilisation

### Comprendre une Nouvelle Base de Code

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

L'IA exécutera repomix, analysera la sortie et fournira une vue d'ensemble structurée de la base de code.

### Trouver des Motifs Spécifiques

```text
"Find all authentication-related code in this repository."
```

L'IA recherchera les motifs d'authentification, catégorisera les résultats par fichier et expliquera comment l'authentification est implémentée.

### Référencer Vos Propres Projets

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

L'IA analysera votre autre dépôt et vous aidera à référencer vos propres implémentations.

## Contenu du Skill

Le skill inclut:

- **Reconnaissance de l'intention utilisateur** - Comprend les différentes façons dont les utilisateurs demandent des analyses de base de code
- **Guide des commandes Repomix** - Sait quelles options utiliser (`--compress`, `--include`, etc.)
- **Workflow d'analyse** - Approche structurée pour explorer les sorties empaquetées
- **Meilleures pratiques** - Conseils d'efficacité comme utiliser grep avant de lire des fichiers entiers

## Ressources Connexes

- [Génération d'Agent Skills](/fr/guide/agent-skills-generation) - Générez vos propres skills à partir de bases de code
- [Plugins Claude Code](/fr/guide/claude-code-plugins) - Plugins Repomix pour Claude Code
- [Serveur MCP](/fr/guide/mcp-server) - Méthode d'intégration alternative
