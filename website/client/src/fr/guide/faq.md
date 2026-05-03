---
title: FAQ et dépannage
description: Réponses aux questions fréquentes sur Repomix, les dépôts privés, les formats de sortie, la réduction de tokens, la sécurité et les workflows IA.
---

# FAQ et dépannage

Cette page aide à choisir le bon workflow Repomix, réduire les sorties volumineuses et préparer un contexte de code pour les assistants IA.

## Questions fréquentes

### À quoi sert Repomix ?

Repomix empaquette un dépôt dans un seul fichier adapté à l'IA. Vous pouvez ainsi fournir à ChatGPT, Claude, Gemini ou d'autres assistants un contexte complet pour revue de code, investigation de bugs, refactorisation, documentation et onboarding.

### Repomix fonctionne-t-il avec les dépôts privés ?

Oui. Exécutez Repomix localement dans un checkout auquel votre machine a déjà accès :

```bash
repomix
```

Relisez le fichier généré avant de le partager avec un service IA externe.

### Peut-il traiter un dépôt GitHub public sans le cloner ?

Oui. Utilisez `--remote` avec la forme courte ou une URL complète :

```bash
npx repomix --remote yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix
```

### Quel format de sortie choisir ?

Utilisez XML par défaut. Choisissez Markdown pour des conversations lisibles, JSON pour l'automatisation et texte brut pour une compatibilité maximale. Changez de format avec `--style` :

```bash
repomix --style markdown
repomix --style json
```

Consultez [Formats de sortie](/fr/guide/output).

## Réduire les tokens

### Le fichier généré est trop volumineux. Que faire ?

Réduisez le contexte :

```bash
repomix --include "src/**/*.ts,docs/**/*.md"
repomix --ignore "**/*.test.ts,dist/**"
repomix --compress
repomix --remove-comments
```

Combinez les patterns include et ignore avec la compression de code pour les grands dépôts.

### Que fait `--compress` ?

`--compress` conserve la structure importante comme imports, exports, classes, fonctions et interfaces, tout en retirant beaucoup de détails d'implémentation. C'est utile pour une analyse d'architecture.

## Sécurité et confidentialité

### La CLI envoie-t-elle mon code ?

La CLI Repomix s'exécute localement et écrit un fichier de sortie sur votre machine. Le site web et l'extension navigateur ont des workflows différents ; consultez la [Politique de confidentialité](/fr/guide/privacy).

### Comment Repomix évite-t-il les secrets ?

Repomix utilise des contrôles basés sur Secretlint. Cela reste une protection supplémentaire : vérifiez toujours la sortie.

## Dépannage

### Pourquoi des fichiers manquent-ils dans la sortie ?

Repomix respecte `.gitignore`, les règles ignore par défaut et les patterns personnalisés. Vérifiez `repomix.config.json`, `--ignore` et vos règles git.

### Comment rendre la sortie reproductible en équipe ?

Créez et versionnez une configuration partagée :

```bash
repomix --init
```

## Ressources liées

- [Utilisation de base](/fr/guide/usage)
- [Options de ligne de commande](/fr/guide/command-line-options)
- [Compression de code](/fr/guide/code-compress)
- [Sécurité](/fr/guide/security)
