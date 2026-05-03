---
title: "Repomix Explorer Skill (Agent Skills)"
description: "Installez l'agent skill Repomix Explorer pour analyser des bases de code locales et distantes avec Claude Code et d'autres assistants IA compatibles avec le format Agent Skills."
---

# Repomix Explorer Skill (Agent Skills)

Repomix fournit un skill **Repomix Explorer** prêt à l'emploi qui permet aux assistants de codage IA d'analyser et d'explorer des bases de code en utilisant Repomix CLI.

Ce skill est conçu pour Claude Code et d'autres assistants IA compatibles avec le format Agent Skills.

## Installation Rapide

Pour Claude Code, installez le plugin officiel Repomix Explorer :

```text
/plugin marketplace add yamadashy/repomix
/plugin install repomix-explorer@repomix
```

Le plugin Claude Code fournit des commandes namespacées comme `/repomix-explorer:explore-local` et `/repomix-explorer:explore-remote`. Consultez [Plugins Claude Code](/fr/guide/claude-code-plugins) pour la configuration complète.

Pour Codex, Cursor, OpenClaw et les autres assistants compatibles Agent Skills, installez le skill autonome avec la Skills CLI :

```bash
npx skills add yamadashy/repomix --skill repomix-explorer
```

Pour cibler un assistant spécifique, utilisez `--agent` :

```bash
npx skills add yamadashy/repomix --skill repomix-explorer --agent codex
npx skills add yamadashy/repomix --skill repomix-explorer --agent openclaw
```

Pour Hermes Agent, installez le skill en fichier unique avec la commande native de Hermes :

```bash
hermes skills install https://raw.githubusercontent.com/yamadashy/repomix/main/.claude/skills/repomix-explorer/SKILL.md
```

Si vous utilisez surtout Hermes pour l'analyse de dépôts, la configuration du [Serveur MCP](/fr/guide/mcp-server) est aussi une bonne option, car elle exécute Repomix directement comme serveur MCP.

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
