# Utilisation de base

## Démarrage rapide

Empaquetez tout votre dépôt:

```bash
repomix
```

## Cas d'utilisation courants

### Empaqueter des répertoires spécifiques

```bash
repomix path/to/directory
```

### Inclure des fichiers spécifiques

Utilisez des [motifs glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Exclure des fichiers

```bash
repomix --ignore "**/*.log,tmp/"
```

### Diviser la Sortie en Plusieurs Fichiers

Lors du travail avec de grandes bases de code, la sortie empaquetée peut dépasser les limites de taille de fichier imposées par certains outils d'IA (par exemple, la limite de 1 Mo de Google AI Studio). Utilisez `--split-output` pour diviser automatiquement la sortie en plusieurs fichiers:

```bash
repomix --split-output 1mb
```

Cela génère des fichiers numérotés comme:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

La taille peut être spécifiée avec des unités: `500kb`, `1mb`, `2mb`, `1.5mb`, etc. Les valeurs décimales sont prises en charge.

> [!NOTE]
> Les fichiers sont regroupés par répertoire de premier niveau pour maintenir le contexte. Un seul fichier ou répertoire ne sera jamais divisé entre plusieurs fichiers de sortie.

### Dépôts distants

```bash
# En utilisant l'URL GitHub
repomix --remote https://github.com/user/repo
# En utilisant le format abrégé
repomix --remote user/repo
# Branche/tag/commit spécifique
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### Entrée de liste de fichiers (stdin)

Passez les chemins de fichiers via stdin pour une flexibilité ultime:

```bash
# En utilisant la commande find
find src -name "*.ts" -type f | repomix --stdin

# En utilisant git pour obtenir les fichiers suivis
git ls-files "*.ts" | repomix --stdin

# En utilisant grep pour trouver des fichiers contenant du contenu spécifique
grep -l "TODO" **/*.ts | repomix --stdin

# En utilisant ripgrep pour trouver des fichiers avec du contenu spécifique
rg -l "TODO|FIXME" --type ts | repomix --stdin

# En utilisant ripgrep (rg) pour trouver des fichiers
rg --files --type ts | repomix --stdin

# En utilisant sharkdp/fd pour trouver des fichiers
fd -e ts | repomix --stdin

# En utilisant fzf pour sélectionner à partir de tous les fichiers
fzf -m | repomix --stdin

# Sélection interactive de fichiers avec fzf
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# En utilisant ls avec des motifs glob
ls src/**/*.ts | repomix --stdin

# À partir d'un fichier contenant des chemins de fichiers
cat file-list.txt | repomix --stdin

# Entrée directe avec echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

L'option `--stdin` vous permet de transmettre une liste de chemins de fichiers à Repomix, offrant une flexibilité ultime dans la sélection des fichiers à empaqueter.

Lorsque vous utilisez `--stdin`, les fichiers spécifiés sont effectivement ajoutés aux motifs d'inclusion. Cela signifie que le comportement normal d'inclusion et d'exclusion s'applique toujours - les fichiers spécifiés via stdin seront toujours exclus s'ils correspondent aux motifs d'exclusion.

> [!NOTE]
> Lors de l'utilisation de `--stdin`, les chemins de fichiers peuvent être relatifs ou absolus, et Repomix gèrera automatiquement la résolution des chemins et la déduplication.

### Compression de code

```bash
repomix --compress

# Vous pouvez également l'utiliser avec des dépôts distants:
repomix --remote yamadashy/repomix --compress
```

### Intégration Git

Inclure des informations Git pour fournir un contexte de développement pour l'analyse IA :

```bash
# Inclure les diffs git (modifications non commitées)
repomix --include-diffs

# Inclure les journaux de commits git (derniers 50 commits par défaut)
repomix --include-logs

# Inclure un nombre spécifique de commits
repomix --include-logs --include-logs-count 10

# Inclure à la fois les diffs et les journaux
repomix --include-diffs --include-logs
```

Cela ajoute un contexte précieux sur :
- **Modifications récentes** : Les diffs Git montrent les modifications non commitées
- **Modèles de développement** : Les journaux Git révèlent quels fichiers sont généralement modifiés ensemble
- **Historique des commits** : Les messages de commits récents donnent un aperçu du focus de développement
- **Relations entre fichiers** : Comprendre quels fichiers sont modifiés dans les mêmes commits

### Optimisation du nombre de jetons

Comprendre la distribution des jetons de votre base de code est crucial pour optimiser les interactions IA. Utilisez l'option `--token-count-tree` pour visualiser l'utilisation des jetons dans votre projet entier:

```bash
repomix --token-count-tree
```

Cela affiche une vue hiérarchique de votre base de code avec les comptes de jetons:

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

Vous pouvez également définir un seuil minimum de jetons pour vous concentrer sur les fichiers plus volumineux:

```bash
repomix --token-count-tree 1000  # Afficher uniquement les fichiers/répertoires avec 1000+ jetons
```

Cela vous aide à:
- **Identifier les fichiers lourds en jetons** - qui pourraient dépasser les limites de contexte IA
- **Optimiser la sélection de fichiers** - en utilisant les motifs `--include` et `--ignore`
- **Planifier les stratégies de compression** - en ciblant les plus gros contributeurs
- **Équilibrer contenu vs contexte** - lors de la préparation du code pour l'analyse IA

## Formats de sortie

### XML (Par défaut)

```bash
repomix --style xml
```

### Markdown

```bash
repomix --style markdown
```

### JSON

```bash
repomix --style json
```

### Texte brut

```bash
repomix --style plain
```

## Options supplémentaires

### Supprimer les commentaires

```bash
repomix --remove-comments
```

### Afficher les numéros de ligne

```bash
repomix --output-show-line-numbers
```

### Copier dans le presse-papiers

```bash
repomix --copy
```

### Désactiver la vérification de sécurité

```bash
repomix --no-security-check
```

## Configuration

Initialiser le fichier de configuration:

```bash
repomix --init
```

Consultez le [Guide de configuration](/fr/guide/configuration) pour les options détaillées.
