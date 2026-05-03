---
title: "Génération d'Agent Skills"
description: "Générez des Agent Skills Claude depuis des dépôts locaux ou distants afin que les assistants IA réutilisent les références de code, la structure du projet et les modèles d'implémentation."
---

# Génération d'Agent Skills

Repomix peut générer une sortie au format [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills), créant un répertoire structuré de Skills qui peut être utilisé comme référence de base de code réutilisable pour les assistants IA.

Cette fonctionnalité est particulièrement puissante lorsque vous souhaitez référencer des implémentations de dépôts distants. En générant des Skills à partir de projets open source, vous pouvez facilement demander à Claude de référencer des modèles ou implémentations spécifiques tout en travaillant sur votre propre code.

Au lieu de générer un seul fichier empaqueté, la génération de Skills crée un répertoire structuré avec plusieurs fichiers de référence optimisés pour la compréhension de l'IA et la recherche compatible avec grep.

> [!NOTE]
> Il s'agit d'une fonctionnalité expérimentale. Le format de sortie et les options peuvent changer dans les futures versions en fonction des retours utilisateurs.

## Utilisation de Base

Générer des Skills depuis votre répertoire local :

```bash
# Générer des Skills depuis le répertoire actuel
repomix --skill-generate

# Générer avec un nom de Skills personnalisé
repomix --skill-generate my-project-reference

# Générer depuis un répertoire spécifique
repomix path/to/directory --skill-generate

# Générer depuis un dépôt distant
repomix --remote https://github.com/user/repo --skill-generate
```

## Sélection de l'Emplacement des Skills

Lorsque vous exécutez la commande, Repomix vous demande de choisir où sauvegarder les Skills :

1. **Personal Skills** (`~/.claude/skills/`) - Disponible pour tous les projets sur votre machine
2. **Project Skills** (`.claude/skills/`) - Partagé avec votre équipe via git

Si le répertoire Skills existe déjà, on vous demandera de confirmer l'écrasement.

> [!TIP]
> Lors de la génération de Project Skills, envisagez de les ajouter à `.gitignore` pour éviter de commiter de gros fichiers :
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Utilisation non interactive

Pour les pipelines CI et les scripts d'automatisation, vous pouvez ignorer toutes les invites interactives en utilisant `--skill-output` et `--force` :

```bash
# Spécifier directement le répertoire de sortie (ignore l'invite de sélection d'emplacement)
repomix --skill-generate --skill-output ./my-skills

# Ignorer la confirmation de remplacement avec --force
repomix --skill-generate --skill-output ./my-skills --force

# Exemple non interactif complet
repomix --remote user/repo --skill-generate my-skill --skill-output ./output --force
```

| Option | Description |
| --- | --- |
| `--skill-output <path>` | Spécifier directement le chemin du répertoire de sortie des skills (ignore l'invite d'emplacement) |
| `-f, --force` | Ignorer toutes les invites de confirmation (ex : remplacement du répertoire de skills) |

## Structure Générée

Les Skills sont générés avec la structure suivante :

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Métadonnées principales et documentation des Skills
└── references/
    ├── summary.md              # But, format et statistiques
    ├── project-structure.md    # Arborescence avec nombre de lignes
    ├── files.md                # Tout le contenu des fichiers (compatible grep)
    └── tech-stacks.md           # Langages, frameworks, dépendances
```

### Descriptions des Fichiers

| Fichier | But | Contenu |
|---------|-----|---------|
| `SKILL.md` | Métadonnées principales et documentation des Skills | Nom des Skills, description, informations du projet, nombre de fichiers/lignes/tokens, aperçu de l'utilisation, cas d'utilisation courants et conseils |
| `references/summary.md` | But, format et statistiques | Explication de la base de code de référence, documentation de la structure des fichiers, directives d'utilisation, répartition par type de fichier et langage |
| `references/project-structure.md` | Découverte de fichiers | Arborescence avec nombre de lignes par fichier |
| `references/files.md` | Référence de code consultable | Tout le contenu des fichiers avec en-têtes de coloration syntaxique, optimisé pour la recherche compatible grep |
| `references/tech-stacks.md` | Résumé du stack technologique | Langages, frameworks, versions runtime, gestionnaires de paquets, dépendances, fichiers de configuration |

#### Exemple : references/project-structure.md

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### Exemple : references/files.md

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### Exemple : references/tech-stacks.md

Stack technologique auto-détecté depuis les fichiers de dépendances :
- **Langages** : TypeScript, JavaScript, Python, etc.
- **Frameworks** : React, Next.js, Express, Django, etc.
- **Versions Runtime** : Node.js, Python, Go, etc.
- **Gestionnaire de Paquets** : npm, pnpm, poetry, etc.
- **Dépendances** : Toutes les dépendances directes et de développement
- **Fichiers de Configuration** : Tous les fichiers de configuration détectés

Détecté depuis des fichiers comme : `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, etc.

## Noms de Skills Auto-Générés

Si aucun nom n'est fourni, Repomix en génère automatiquement un avec ce modèle :

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (normalisé en kebab-case)
```

Les noms de Skills sont :
- Convertis en kebab-case (minuscules, séparés par des tirets)
- Limités à 64 caractères maximum
- Protégés contre le path traversal

## Intégration avec les Options Repomix

La génération de Skills respecte toutes les options standard de Repomix :

```bash
# Générer des Skills avec filtrage de fichiers
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Générer des Skills avec compression
repomix --skill-generate --compress

# Générer des Skills depuis un dépôt distant
repomix --remote yamadashy/repomix --skill-generate

# Générer des Skills avec des options de format de sortie spécifiques
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Skills Documentation Uniquement

En utilisant `--include`, vous pouvez générer des Skills contenant uniquement la documentation d'un dépôt GitHub. C'est utile quand vous voulez que Claude référence une documentation spécifique de bibliothèque ou framework pendant que vous travaillez sur votre code :

```bash
# Documentation Claude Code Action
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Documentation Vite
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# Documentation React
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Limitations

L'option `--skill-generate` ne peut pas être utilisée avec :
- `--stdout` - La sortie Skills nécessite l'écriture sur le système de fichiers
- `--copy` - La sortie Skills est un répertoire, non copiable dans le presse-papiers

## Utilisation des Skills Générés

Une fois générés, vous pouvez utiliser les Skills avec Claude :

1. **Claude Code** : Les Skills sont automatiquement disponibles s'ils sont sauvegardés dans `~/.claude/skills/` ou `.claude/skills/`
2. **Claude Web** : Téléchargez le répertoire Skills vers Claude pour l'analyse de base de code
3. **Partage d'Équipe** : Commitez `.claude/skills/` dans votre dépôt pour un accès de toute l'équipe

## Exemple de Workflow

### Créer une Bibliothèque de Référence Personnelle

```bash
# Cloner et analyser un projet open source intéressant
repomix --remote facebook/react --skill-generate react-reference

# Les Skills sont sauvegardés dans ~/.claude/skills/react-reference/
# Maintenant vous pouvez référencer la base de code de React dans n'importe quelle conversation Claude
```

### Documentation de Projet d'Équipe

```bash
# Dans votre répertoire de projet
cd my-project

# Générer des Skills pour votre équipe
repomix --skill-generate

# Choisissez "Project Skills" quand demandé
# Les Skills sont sauvegardés dans .claude/skills/repomix-reference-my-project/

# Commitez et partagez avec votre équipe
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## Ressources Connexes

- [Plugins Claude Code](/fr/guide/claude-code-plugins) - En savoir plus sur les plugins Repomix pour Claude Code
- [Serveur MCP](/fr/guide/mcp-server) - Méthode d'intégration alternative
- [Compression de Code](/fr/guide/code-compress) - Réduire le nombre de tokens avec la compression
- [Configuration](/fr/guide/configuration) - Personnaliser le comportement de Repomix
