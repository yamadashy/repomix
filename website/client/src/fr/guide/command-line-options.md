# Options de ligne de commande

## Options de base
- `-v, --version`: Afficher la version de l'outil

## Options de sortie
- `-o, --output <fichier>`: Nom du fichier de sortie (par défaut: `repomix-output.txt`)
- `--stdout`: Sortie vers la sortie standard au lieu d'écrire dans un fichier (ne peut pas être utilisé avec l'option `--output`)
- `--style <type>`: Style de sortie (`plain`, `xml`, `markdown`) (par défaut: `xml`)
- `--parsable-style`: Activer une sortie analysable basée sur le schéma du style choisi (par défaut: `false`)
- `--compress`: Effectuer une extraction intelligente du code, en se concentrant sur les signatures essentielles de fonctions et de classes tout en supprimant les détails d'implémentation. Pour plus de détails et d'exemples, voir [Guide de compression de code](code-compress).
- `--output-show-line-numbers`: Ajouter les numéros de ligne (par défaut: `false`)
- `--copy`: Copier dans le presse-papiers (par défaut: `false`)
- `--no-file-summary`: Désactiver le résumé des fichiers (par défaut: `true`)
- `--no-directory-structure`: Désactiver la structure des répertoires (par défaut: `true`)
- `--no-files`: Désactiver la sortie du contenu des fichiers (mode métadonnées uniquement) (par défaut: `true`)
- `--remove-comments`: Supprimer les commentaires (par défaut: `false`)
- `--remove-empty-lines`: Supprimer les lignes vides (par défaut: `false`)
- `--header-text <texte>`: Texte personnalisé à inclure dans l'en-tête du fichier
- `--instruction-file-path <chemin>`: Chemin vers un fichier contenant des instructions personnalisées détaillées
- `--include-empty-directories`: Inclure les répertoires vides dans la sortie (par défaut: `false`)
- `--include-diffs`: Inclure les différences git dans la sortie (inclut séparément les modifications de l'arbre de travail et les modifications indexées) (par défaut: `false`)

## Options de filtrage
- `--include <motifs>`: Motifs d'inclusion (séparés par des virgules)
- `-i, --ignore <motifs>`: Motifs d'exclusion (séparés par des virgules)
- `--no-gitignore`: Désactiver l'utilisation du fichier .gitignore
- `--no-default-patterns`: Désactiver les motifs par défaut

## Options de dépôt distant
- `--remote <url>`: Traiter un dépôt distant
- `--remote-branch <n>`: Spécifier le nom de la branche distante, le tag ou le hash de commit (par défaut: branche par défaut du dépôt)

## Options de configuration
- `-c, --config <chemin>`: Chemin du fichier de configuration personnalisé
- `--init`: Créer un fichier de configuration
- `--global`: Utiliser la configuration globale

## Options de sécurité
- `--no-security-check`: Désactiver la vérification de sécurité (par défaut: `true`)

## Options de comptage de tokens
- `--token-count-encoding <encodage>`: Spécifier l'encodage du comptage de tokens (par exemple, `o200k_base`, `cl100k_base`) (par défaut: `o200k_base`)

## Autres options
- `--top-files-len <nombre>`: Nombre de fichiers principaux à afficher (par défaut: `5`)
- `--verbose`: Activer la journalisation détaillée
- `--quiet`: Désactiver toutes les sorties vers stdout

## Exemples

```bash
# Utilisation de base
repomix

# Sortie personnalisée
repomix -o output.xml --style xml

# Sortie vers la sortie standard
repomix --stdout > custom-output.txt

# Envoi de la sortie vers la sortie standard, puis redirection vers une autre commande (par exemple, simonw/llm)
repomix --stdout | llm "Veuillez expliquer ce que fait ce code"

# Sortie personnalisée avec compression
repomix --compress

# Traiter des fichiers spécifiques
repomix --include "src/**/*.ts" --ignore "**/*.test.ts"

# Dépôt distant avec branche
repomix --remote https://github.com/user/repo/tree/main

# Dépôt distant avec commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Dépôt distant avec format abrégé
repomix --remote user/repo

# Liste de fichiers depuis stdin (détection automatique)
find src -name "*.ts" -type f | repomix
git ls-files "*.js" | repomix
echo -e "src/index.ts\nsrc/utils.ts" | repomix
```
