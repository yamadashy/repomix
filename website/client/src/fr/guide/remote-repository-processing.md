---
title: "Traitement des dépôts GitHub"
description: "Empaquetez des dépôts GitHub avec Repomix via URL complète, raccourci user/repo, branches, tags, commits, Docker et contrôles de confiance de configuration distante."
---

# Traitement des dépôts GitHub

## Utilisation de base

Traiter des dépôts publics:
```bash
# En utilisant l'URL complète
repomix --remote https://github.com/user/repo
# En utilisant le format abrégé GitHub
repomix --remote user/repo
```

Vous pouvez aussi passer le format abrégé `owner/repo` directement, sans `--remote` :

```bash
repomix yamadashy/repomix
```

Comme `owner/repo` ressemble aussi à un chemin local relatif, Repomix ne le traite comme un dépôt distant que lorsqu'aucun fichier ou dossier local de ce nom n'existe et que le dépôt est accessible sur GitHub. Un chemin local existant a toujours la priorité ; pour forcer le traitement local d'un chemin en forme `owner/repo`, préfixez-le par `./` (par exemple, `repomix ./owner/repo`). Si l'argument correspond au motif mais que le dépôt est inaccessible (par exemple un dépôt privé ou une faute de frappe), Repomix le traite alors comme un chemin local.

## Sélection de branche et de commit

```bash
# Branche spécifique
repomix --remote user/repo --remote-branch main
# Tag
repomix --remote user/repo --remote-branch v1.0.0
# Hash de commit
repomix --remote user/repo --remote-branch 935b695
```

## Prérequis

- Git doit être installé
- Connexion Internet
- Accès en lecture au dépôt

## Contrôle de la sortie

```bash
# Emplacement de sortie personnalisé
repomix --remote user/repo -o custom-output.xml
# Avec format XML
repomix --remote user/repo --style xml
# Supprimer les commentaires
repomix --remote user/repo --remove-comments
```

## Utilisation avec Docker

```bash
# Traiter et sortir dans le répertoire courant
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
# Sortie vers un répertoire spécifique
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## Sécurité

Par mesure de sécurité, les fichiers de configuration (`repomix.config.*`) des dépôts distants ne sont pas chargés par défaut. Cela empêche les dépôts non fiables d'exécuter du code via des fichiers de configuration tels que `repomix.config.ts`.

Votre configuration globale et vos options CLI restent appliquées.

Pour faire confiance à la configuration d'un dépôt distant :

```bash
# Via le flag CLI
repomix --remote user/repo --remote-trust-config

# Via une variable d'environnement
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

::: warning
`--remote-trust-config` accorde à la configuration du dépôt distant le même niveau de confiance qu'à votre propre machine. Une configuration de confiance peut **exécuter des commandes arbitraires** (via `input.processors`) et **lire des fichiers locaux en dehors du dépôt** (par exemple via `output.instructionFilePath` ou des motifs d'inclusion utilisant `../`). N'utilisez cette option que pour des dépôts auxquels vous faites entièrement confiance et que vous avez vérifiés, avec la même prudence que vous appliqueriez avant d'exécuter un `npm install` ou un `Makefile` provenant d'une source inconnue.
:::

### Invite de confirmation

Lorsque vous faites confiance à la configuration d'un dépôt dans un terminal interactif, repomix affiche la configuration qui est sur le point de s'exécuter et vous demande de confirmer avant de la charger :

- **Oui, une seule fois** : ne fait confiance qu'à cette exécution.
- **Oui, et ne plus demander pour ce dépôt** : mémorisé jusqu'à ce que vos fichiers temporaires soient effacés, et seulement tant que ce fichier de configuration reste inchangé (un fichier de configuration modifié déclenche à nouveau l'invite). Notez que cela ne concerne que le fichier de configuration lui-même : une configuration `.ts` / `.js` peut importer d'autres fichiers, qui ne font pas partie de cette vérification.
- **Non** : abandonne sans exécuter la configuration.

L'invite est ignorée si vous passez `--force`, dans des shells non interactifs tels que la CI (la configuration reste alors considérée comme fiable comme auparavant, ce qui permet aux automatisations existantes de continuer à fonctionner), ou une fois que vous avez choisi de toujours faire confiance à ce dépôt.

Pour le modèle de confiance complet — ce qu'une configuration de confiance peut faire, comment la configuration affichée est protégée contre toute altération, et où est stockée la décision « ne plus demander » — consultez la page [Sécurité](/fr/guide/security#remote-repository-config-trust).

Lors de l'utilisation de `--config` avec `--remote`, un chemin absolu est requis :

```bash
repomix --remote user/repo --config /home/user/repomix.config.json
```

## Problèmes courants

### Problèmes d'accès
- Assurez-vous que le dépôt est public
- Vérifiez l'installation de Git
- Vérifiez la connexion Internet

### Dépôts volumineux
- Utilisez `--include` pour sélectionner des chemins spécifiques
- Activez `--remove-comments`
- Traitez les branches séparément

## Ressources associées

- [Options de ligne de commande](/fr/guide/command-line-options) - Référence complète de la CLI incluant les options `--remote`
- [Configuration](/fr/guide/configuration) - Configurer les options par défaut pour le traitement distant
- [Compression de code](/fr/guide/code-compress) - Réduire la taille de sortie pour les grands dépôts
- [Sécurité](/fr/guide/security) - Comment Repomix gère la détection de données sensibles
