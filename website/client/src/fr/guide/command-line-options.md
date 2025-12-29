# Options de ligne de commande

## Options de base
- `-v, --version`: Afficher la version de l'outil

## Options d'entrée/sortie CLI
- `--verbose`: Activer la journalisation détaillée
- `--quiet`: Désactiver toute sortie vers stdout
- `--stdout`: Sortie vers stdout au lieu d'écrire dans un fichier (ne peut pas être utilisé avec l'option `--output`)
- `--stdin`: Lire les chemins de fichiers depuis stdin au lieu de découvrir automatiquement les fichiers
- `--copy`: Copier en plus la sortie générée dans le presse-papiers système
- `--token-count-tree [threshold]`: Afficher l'arbre de fichiers avec des résumés de comptage de jetons (optionnel : seuil minimum de comptage de jetons). Utile pour identifier les gros fichiers et optimiser l'utilisation des jetons pour les limites de contexte IA
- `--top-files-len <number>`: Nombre des plus gros fichiers à afficher dans le résumé (par défaut : 5, ex : --top-files-len 20)

## Options de sortie Repomix
- `-o, --output <file>`: Chemin du fichier de sortie (par défaut : repomix-output.xml, utiliser "-" pour stdout)
- `--style <type>`: Format de sortie : xml, markdown, json ou plain (par défaut : xml)
- `--parsable-style`: Activer la sortie analysable basée sur le schéma de style choisi. Notez que cela peut augmenter le nombre de jetons.
- `--compress`: Effectuer une extraction de code intelligente, en se concentrant sur les signatures de fonctions et de classes essentielles pour réduire le nombre de jetons
- `--output-show-line-numbers`: Afficher les numéros de ligne dans la sortie
- `--no-file-summary`: Désactiver la sortie de la section de résumé de fichier
- `--no-directory-structure`: Désactiver la sortie de la section de structure de répertoire
- `--no-files`: Désactiver la sortie du contenu des fichiers (mode métadonnées uniquement)
- `--remove-comments`: Supprimer les commentaires des types de fichiers pris en charge
- `--remove-empty-lines`: Supprimer les lignes vides de la sortie
- `--truncate-base64`: Activer la troncature des chaînes de données base64
- `--header-text <text>`: Texte personnalisé à inclure dans l'en-tête du fichier
- `--instruction-file-path <path>`: Chemin vers un fichier contenant des instructions personnalisées détaillées
- `--split-output <size>`: Diviser la sortie en plusieurs fichiers numérotés (p. ex. : repomix-output.1.xml, repomix-output.2.xml); avec des tailles comme 500kb, 2mb ou 1.5mb
- `--include-empty-directories`: Inclure les répertoires vides dans la sortie
- `--include-full-directory-structure`: Afficher l'arborescence complète du dépôt dans la section Structure de répertoire, même lors de l'utilisation de motifs --include
- `--include-diffs`: Inclure les diffs git dans la sortie (inclut les modifications de l'arbre de travail et les modifications indexées séparément)
- `--include-logs`: Inclure les journaux git dans la sortie (inclut l'historique des commits avec les dates, les messages et les chemins de fichiers)
- `--include-logs-count <count>`: Nombre de commits de journaux git à inclure (par défaut : 50)
- `--no-git-sort-by-changes`: Désactiver le tri des fichiers par nombre de modifications git (activé par défaut)

## Options de sélection de fichiers
- `--include <patterns>`: Liste des motifs d'inclusion (séparés par des virgules)
- `-i, --ignore <patterns>`: Motifs d'ignorance supplémentaires (séparés par des virgules)
- `--no-gitignore`: Désactiver l'utilisation du fichier .gitignore
- `--no-dot-ignore`: Désactiver l'utilisation du fichier .ignore
- `--no-default-patterns`: Désactiver les motifs par défaut

## Options de dépôt distant
- `--remote <url>`: Traiter un dépôt distant
- `--remote-branch <name>`: Spécifier le nom de la branche distante, le tag ou le hash de commit (par défaut à la branche par défaut du dépôt)

## Options de configuration
- `-c, --config <path>`: Chemin du fichier de configuration personnalisé
- `--init`: Créer un fichier de configuration
- `--global`: Utiliser la configuration globale

## Options de sécurité
- `--no-security-check`: Ignorer la recherche de données sensibles comme les clés API et mots de passe

## Options de comptage de jetons
- `--token-count-encoding <encoding>`: Modèle de tokenizer pour le comptage : o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), etc. (par défaut : o200k_base)

## Options MCP
- `--mcp`: Fonctionner comme serveur Model Context Protocol pour l'intégration d'outils IA

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

