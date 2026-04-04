# Traitement des dépôts GitHub

## Utilisation de base

Traiter des dépôts publics:
```bash
# En utilisant l'URL complète
repomix --remote https://github.com/user/repo
# En utilisant le format abrégé GitHub
repomix --remote user/repo
```

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
