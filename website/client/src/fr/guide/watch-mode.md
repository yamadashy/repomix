---
title: Mode surveillance
description: Réempaquetez automatiquement votre base de code à chaque modification de fichier avec le mode surveillance de Repomix, avec gestion du debounce, des règles d'exclusion et de la compatibilité des options.
---

# Mode surveillance

Repomix peut surveiller votre base de code et la réempaqueter automatiquement dès que des fichiers changent. Cela maintient le fichier de sortie à jour pendant que vous travaillez, ce qui est pratique lorsque vous souhaitez fournir un instantané continuellement rafraîchi à un assistant IA.

## Utilisation

Lancez le mode surveillance avec l'option `-w` (ou `--watch`) :

```bash
repomix --watch
```

Repomix effectue un empaquetage initial, puis continue de s'exécuter et réempaquète à chaque modification. Vous pouvez combiner le mode surveillance avec les options habituelles :

```bash
# Surveiller un ensemble de fichiers spécifique
repomix -w --include "src/**/*.ts"

# Surveiller avec un fichier de sortie et un format personnalisés
repomix --watch -o output.md --style markdown
```

Appuyez sur `Ctrl+C` pour arrêter la surveillance.

## Fonctionnement

- **Empaquetage initial** : Repomix empaquète la base de code une fois, puis indique combien de fichiers il surveille.
- **Détection des modifications** : les fichiers nouveaux, modifiés et supprimés déclenchent tous un réempaquetage.
- **Debounce** : les rafales rapides de modifications (par exemple, changer de branche ou enregistrer de nombreux fichiers en même temps) sont regroupées. Repomix attend `300 ms` après la dernière modification avant de réempaqueter, de sorte qu'une série de changements aboutisse à une seule reconstruction.
- **Horodatages** : après chaque reconstruction, Repomix affiche un horodatage (`Rebuilt at HH:MM:SS`) afin que vous puissiez savoir quand la sortie a été rafraîchie pour la dernière fois.

## Fichiers ignorés

Le mode surveillance respecte les mêmes règles d'exclusion qu'une exécution normale : `.gitignore`, `.repomixignore`, les motifs par défaut intégrés (tels que `node_modules` et `.git`) et tous les motifs `--ignore` que vous fournissez. Les répertoires ignorés ne sont pas surveillés, ce qui garde le mode surveillance efficace sur les grands projets.

## Compatibilité des options

Le mode surveillance ne fonctionne qu'avec des répertoires locaux : il ne peut donc pas être combiné avec les options suivantes (que vous les définissiez en ligne de commande ou dans votre fichier de configuration) :

- `--remote` ou une URL de dépôt distant en argument positionnel : le mode surveillance est local uniquement
- `--stdout` ou `--stdin` : les modes de flux n'ont pas de fichier de sortie persistant à rafraîchir
- `--split-output`
- `--skill-generate`
- `--copy` : réempaqueter à chaque modification écraserait le presse-papiers de façon répétée

Si vous combinez l'une de ces options avec `--watch`, Repomix s'arrête avec une erreur expliquant le conflit.

## Ressources connexes

- [Options de ligne de commande](/fr/guide/command-line-options) - Référence CLI complète, y compris `--watch`
- [Utilisation de base](/fr/guide/usage) - Autres façons d'exécuter Repomix
- [Configuration](/fr/guide/configuration) - Définir les options de sortie par défaut dans votre fichier de configuration
