---
layout: home
title: Repomix
description: "Regroupez des dépôts locaux ou distants en XML, Markdown, JSON ou texte brut adaptés à l'IA pour Claude, ChatGPT, Gemini, MCP et les revues de code."
titleTemplate: Empaquetez votre code dans des formats adaptés à l'IA
aside: false
editLink: false

features:
  - icon: 🤖
    title: Optimisé pour l'IA
    details: Formate votre base de code d'une manière facilement compréhensible et traitable par l'IA.
  - icon: ⚙️
    title: Compatible avec Git
    details: Respecte automatiquement vos fichiers .gitignore.
  - icon: 🛡️
    title: Axé sur la sécurité
    details: Intègre Secretlint pour des vérifications de sécurité robustes afin de détecter et prévenir l'inclusion d'informations sensibles.
  - icon: 📊
    title: Comptage de tokens
    details: Fournit le nombre de tokens pour chaque fichier et l'ensemble du dépôt, utile pour les limites de contexte des LLM.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Nomination aux Open Source Awards

Nous sommes honorés ! Repomix a été nominé dans la catégorie **Powered by AI** aux [JSNation Open Source Awards 2025](https://osawards.com/javascript/).

Cela n'aurait pas été possible sans vous tous qui utilisez et soutenez Repomix. Merci !

## Qu'est-ce que Repomix ?

Repomix est un outil puissant qui package votre base de code entière en un seul fichier compatible avec l'IA. Que vous travailliez sur des revues de code, du refactoring ou que vous ayez besoin d'assistance IA pour votre projet, Repomix facilite le partage de tout le contexte de votre dépôt avec les outils d'IA.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Démarrage rapide

Une fois que vous avez généré un fichier compressé (`repomix-output.xml`) avec Repomix, vous pouvez l'envoyer à un assistant IA (comme ChatGPT, Claude) avec une instruction comme :

```
Ce fichier contient tous les fichiers du dépôt combinés en un seul.
Je souhaite refactoriser le code, veuillez donc d'abord l'examiner.
```

L'IA analysera votre base de code complète et fournira des informations détaillées :

![Utilisation de Repomix 1](/images/docs/repomix-file-usage-1.png)

Lors de la discussion de modifications spécifiques, l'IA peut vous aider à générer du code. Avec des fonctionnalités comme les Artefacts de Claude, vous pouvez même recevoir plusieurs fichiers interdépendants :

![Utilisation de Repomix 2](/images/docs/repomix-file-usage-2.png)

Bon codage ! 🚀

## Pourquoi Repomix ?

La force de Repomix réside dans sa capacité à fonctionner avec des services d'abonnement comme ChatGPT, Claude, Gemini, Grok sans se soucier des coûts, tout en fournissant un contexte complet de la base de code qui élimine le besoin d'exploration de fichiers, rendant l'analyse plus rapide et souvent plus précise.

Avec l'ensemble de la base de code disponible comme contexte, Repomix permet une large gamme d'applications incluant la planification d'implémentation, l'investigation de bugs, les vérifications de sécurité de bibliothèques tierces, la génération de documentation et bien plus encore.

## Utilisation de l'outil CLI {#using-the-cli-tool}

Repomix peut être utilisé comme un outil en ligne de commande, offrant des fonctionnalités puissantes et des options de personnalisation.

**L'outil CLI peut accéder aux dépôts privés** car il utilise votre Git installé localement.

### Démarrage rapide

Vous pouvez essayer Repomix instantanément dans votre répertoire de projet sans installation :

```bash
npx repomix@latest
```

Ou l'installer globalement pour une utilisation répétée :

```bash
# Installation avec npm
npm install -g repomix

# Ou avec yarn
yarn global add repomix

# Ou avec bun
bun add -g repomix

# Ou avec Homebrew (macOS/Linux)
brew install repomix

# Puis exécuter dans n'importe quel répertoire de projet
repomix
```

C'est tout ! Repomix générera un fichier `repomix-output.xml` dans votre répertoire actuel, contenant l'intégralité de votre dépôt dans un format adapté à l'IA.

### Utilisation

Pour empaqueter tout votre dépôt :

```bash
repomix
```

Pour empaqueter un répertoire spécifique :

```bash
repomix path/to/directory
```

Pour empaqueter des fichiers ou répertoires spécifiques en utilisant des [motifs glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) :

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Pour exclure des fichiers ou répertoires spécifiques :

```bash
repomix --ignore "**/*.log,tmp/"
```

Pour empaqueter un dépôt distant :
```bash
# Utilisation du format abrégé
npx repomix --remote yamadashy/repomix

# Utilisation de l'URL complète (prend en charge les branches et les chemins spécifiques)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Utilisation de l'URL d'un commit
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

Pour initialiser un nouveau fichier de configuration (`repomix.config.json`) :

```bash
repomix --init
```

Une fois que vous avez généré le fichier compressé, vous pouvez l'utiliser avec des outils d'IA générative comme Claude, ChatGPT et Gemini.

#### Utilisation avec Docker

Vous pouvez également exécuter Repomix avec Docker 🐳  
C'est utile si vous souhaitez exécuter Repomix dans un environnement isolé ou préférez utiliser des conteneurs.

Utilisation de base (répertoire courant) :

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Pour empaqueter un répertoire spécifique :
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Traiter un dépôt distant et sortir vers un répertoire `output` :

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Formats de sortie

Choisissez votre format de sortie préféré :

```bash
# Format XML (par défaut)
repomix --style xml

# Format Markdown
repomix --style markdown

# Format JSON
repomix --style json

# Format texte brut
repomix --style plain
```

### Personnalisation

Créez un `repomix.config.json` pour des paramètres persistants :

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## Cas d'Usage Réels

### [Flux de Travail de Génération de Code avec LLM](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

Un développeur partage comment il utilise Repomix pour extraire le contexte du code des bases de code existantes, puis exploite ce contexte avec des LLMs comme Claude et Aider pour des améliorations incrémentales, des revues de code et la génération automatisée de documentation.

### [Création de Paquets de Connaissances pour les LLMs](https://lethain.com/competitive-advantage-author-llms/)

Les auteurs utilisent Repomix pour emballer leur contenu écrit—blogs, documentation et livres—dans des formats compatibles LLM, permettant aux lecteurs d'interagir avec leur expertise via des systèmes de questions-réponses alimentés par l'IA.

[Découvrir plus de cas d'usage →](./guide/use-cases)

## Guide des Utilisateurs Avancés

Repomix offre des fonctionnalités puissantes pour les cas d'usage avancés. Voici quelques guides essentiels pour les utilisateurs avancés :

- **[Serveur MCP](./guide/mcp-server)** - Intégration du Model Context Protocol pour les assistants IA
- **[GitHub Actions](./guide/github-actions)** - Automatisez l'empaquetage des bases de code dans les workflows CI/CD
- **[Compression de Code](./guide/code-compress)** - Compression intelligente basée sur Tree-sitter (~70% de réduction de tokens)
- **[Utiliser comme Bibliothèque](./guide/development/using-repomix-as-a-library)** - Intégrez Repomix dans vos applications Node.js
- **[Instructions Personnalisées](./guide/custom-instructions)** - Ajoutez des prompts et instructions personnalisés aux sorties
- **[Fonctionnalités de Sécurité](./guide/security)** - Intégration Secretlint intégrée et vérifications de sécurité
- **[Meilleures Pratiques](./guide/tips/best-practices)** - Optimisez vos workflows IA avec des stratégies éprouvées

### Plus d'exemples
::: tip Besoin de plus d'aide ? 💡
Consultez notre [guide](./guide/) pour des instructions détaillées, ou visitez notre [dépôt GitHub](https://github.com/yamadashy/repomix) pour plus d'exemples et le code source.
:::

</div>
