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

### Entrée de liste de fichiers (pipe via stdin)

Passez les chemins de fichiers via stdin pour une flexibilité ultime:

```bash
# En utilisant la commande find
find src -name "*.ts" -type f | repomix

# En utilisant git pour obtenir les fichiers suivis
git ls-files "*.ts" | repomix

# En utilisant ls avec des motifs glob
ls src/**/*.ts | repomix

# À partir d'un fichier contenant des chemins de fichiers
cat file-list.txt | repomix

# Entrée directe avec echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix

# En utilisant la commande find avec tiret (indicateur stdin explicite)
find src -name "*.ts" | repomix -
```

Repomix détecte automatiquement lorsque les chemins de fichiers sont transmis via stdin, offrant une flexibilité ultime dans la sélection des fichiers à empaqueter.

> [!NOTE]
> Lors de l'utilisation d'entrée stdin, les chemins de fichiers peuvent être relatifs ou absolus, et Repomix gèrera automatiquement la résolution des chemins et la déduplication.

### Compression de code

```bash
repomix --compress
# Vous pouvez également l'utiliser avec des dépôts distants:
repomix --remote yamadashy/repomix --compress
```

## Formats de sortie

### XML (Par défaut)

```bash
repomix --style xml
```

### Markdown

```bash
repomix --style markdown
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
