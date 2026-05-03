---
title: "Options de ligne de commande"
description: "Consultez toutes les options de la CLI Repomix pour l'entrée, la sortie, la sélection de fichiers, les dépôts distants, la configuration, la sécurité, le comptage des tokens, MCP et les Agent Skills."
---

# Options de ligne de commande

## Options de base
- `-v, --version`: Afficher la version de l'outil

## Options d'entrée/sortie CLI

| Option | Description |
|--------|-------------|
| `--verbose` | Activer la journalisation de débogage détaillée (affiche le traitement des fichiers, les comptages de jetons et les détails de configuration) |
| `--quiet` | Supprimer toute sortie console sauf les erreurs (utile pour les scripts) |
| `--stdout` | Écrire la sortie empaquetée directement vers stdout au lieu d'un fichier (supprime toute journalisation) |
| `--stdin` | Lire les chemins de fichiers depuis stdin, un par ligne (les fichiers spécifiés sont traités directement) |
| `--copy` | Copier la sortie générée dans le presse-papiers système après le traitement |
| `--token-count-tree [threshold]` | Afficher l'arbre des fichiers avec les comptages de jetons ; seuil optionnel pour n'afficher que les fichiers avec au moins N jetons (ex : `--token-count-tree 100`) |
| `--top-files-len <number>` | Nombre des plus gros fichiers à afficher dans le résumé (par défaut : `5`) |

## Options de sortie Repomix

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Chemin du fichier de sortie (par défaut : `repomix-output.xml`, utiliser `"-"` pour stdout) |
| `--style <style>` | Format de sortie : `xml`, `markdown`, `json` ou `plain` (par défaut : `xml`) |
| `--parsable-style` | Échapper les caractères spéciaux pour assurer un XML/Markdown valide (nécessaire lorsque la sortie contient du code qui casse le formatage) |
| `--compress` | Extraire la structure essentielle du code (classes, fonctions, interfaces) via l'analyse Tree-sitter |
| `--output-show-line-numbers` | Préfixer chaque ligne avec son numéro de ligne dans la sortie |
| `--no-file-summary` | Omettre la section de résumé des fichiers de la sortie |
| `--no-directory-structure` | Omettre la visualisation de l'arborescence des répertoires de la sortie |
| `--no-files` | Générer uniquement les métadonnées sans le contenu des fichiers (utile pour l'analyse de dépôt) |
| `--remove-comments` | Supprimer tous les commentaires de code avant l'empaquetage |
| `--remove-empty-lines` | Supprimer les lignes vides de tous les fichiers |
| `--truncate-base64` | Tronquer les longues chaînes de données base64 pour réduire la taille de la sortie |
| `--header-text <text>` | Texte personnalisé à inclure au début de la sortie |
| `--instruction-file-path <path>` | Chemin vers un fichier contenant des instructions personnalisées à inclure dans la sortie |
| `--split-output <size>` | Diviser la sortie en plusieurs fichiers numérotés (p. ex. `repomix-output.1.xml`) ; taille comme `500kb`, `2mb` ou `1.5mb` |
| `--include-empty-directories` | Inclure les dossiers sans fichiers dans la structure de répertoires |
| `--include-full-directory-structure` | Afficher l'arborescence complète du dépôt dans la section Structure de répertoire, même lors de l'utilisation de motifs `--include` |
| `--no-git-sort-by-changes` | Ne pas trier les fichiers par fréquence de modifications git (par défaut : fichiers les plus modifiés en premier) |
| `--include-diffs` | Ajouter une section diff git montrant les modifications de l'arbre de travail et les modifications indexées |
| `--include-logs` | Ajouter l'historique des commits git avec les messages et les fichiers modifiés |
| `--include-logs-count <count>` | Nombre de commits récents à inclure avec `--include-logs` (par défaut : `50`) |

## Options de sélection de fichiers

| Option | Description |
|--------|-------------|
| `--include <patterns>` | Inclure uniquement les fichiers correspondant à ces motifs glob (séparés par des virgules, ex : `"src/**/*.js,*.md"`) |
| `-i, --ignore <patterns>` | Motifs supplémentaires à exclure (séparés par des virgules, ex : `"*.test.js,docs/**"`) |
| `--no-gitignore` | Ne pas utiliser les règles `.gitignore` pour filtrer les fichiers |
| `--no-dot-ignore` | Ne pas utiliser les règles `.ignore` pour filtrer les fichiers |
| `--no-default-patterns` | Ne pas appliquer les motifs d'exclusion intégrés (`node_modules`, `.git`, répertoires de build, etc.) |

## Options de dépôt distant

| Option | Description |
|--------|-------------|
| `--remote <url>` | Cloner et empaqueter un dépôt distant (URL GitHub ou format `user/repo`) |
| `--remote-branch <name>` | Branche, tag ou commit spécifique à utiliser (par défaut : branche par défaut du dépôt) |
| `--remote-trust-config` | Faire confiance et charger les fichiers de configuration des dépôts distants (désactivé par défaut pour la sécurité) |

## Options de configuration

| Option | Description |
|--------|-------------|
| `-c, --config <path>` | Utiliser un fichier de configuration personnalisé au lieu de `repomix.config.json` |
| `--init` | Créer un nouveau fichier `repomix.config.json` avec les valeurs par défaut |
| `--global` | Avec `--init`, créer la configuration dans le répertoire personnel au lieu du répertoire courant |

## Options de sécurité
- `--no-security-check`: Ignorer la recherche de données sensibles comme les clés API et mots de passe

## Options de comptage de jetons
- `--token-count-encoding <encoding>`: Modèle de tokenizer pour le comptage : o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), etc. (par défaut : o200k_base)

## Options MCP
- `--mcp`: Fonctionner comme serveur Model Context Protocol pour l'intégration d'outils IA

## Options de génération d'Agent Skills

| Option | Description |
|--------|-------------|
| `--skill-generate [name]` | Générer une sortie au format Claude Agent Skills dans le répertoire `.claude/skills/<name>/` (nom auto-généré si omis) |
| `--skill-output <path>` | Spécifier directement le chemin du répertoire de sortie des skills (ignore l'invite d'emplacement) |
| `-f, --force` | Ignorer toutes les invites de confirmation (ex : remplacement du répertoire de skills) |

## Ressources associées

- [Configuration](/fr/guide/configuration) - Définir les options dans le fichier de configuration au lieu des flags CLI
- [Formats de sortie](/fr/guide/output) - Détails sur XML, Markdown, JSON et texte brut
- [Compression de code](/fr/guide/code-compress) - Comment `--compress` fonctionne avec Tree-sitter
- [Sécurité](/fr/guide/security) - Ce que `--no-security-check` désactive

## Exemples

```bash
# Utilisation de base
repomix

# Fichier de sortie et format personnalisés
repomix -o my-output.xml --style xml

# Sortie vers stdout
repomix --stdout > custom-output.txt

# Sortie vers stdout, puis redirection vers une autre commande (par exemple, simonw/llm)
repomix --stdout | llm "Veuillez expliquer ce que fait ce code."

# Sortie personnalisée avec compression
repomix --compress

# Traiter des fichiers spécifiques avec des motifs
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# Dépôt distant avec branche
repomix --remote https://github.com/user/repo/tree/main

# Dépôt distant avec commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Dépôt distant avec forme abrégée
repomix --remote user/repo

# Liste de fichiers utilisant stdin
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Intégration Git
repomix --include-diffs  # Inclure les diffs git pour les modifications non commitées
repomix --include-logs   # Inclure les journaux git (derniers 50 commits par défaut)
repomix --include-logs --include-logs-count 10  # Inclure les 10 derniers commits
repomix --include-diffs --include-logs  # Inclure à la fois les diffs et les journaux

# Analyse du comptage de jetons
repomix --token-count-tree
repomix --token-count-tree 1000  # Afficher uniquement les fichiers/répertoires avec 1000+ jetons
```

