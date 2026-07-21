---
title: "Sécurité"
description: "Découvrez comment Repomix utilise Secretlint et des contrôles de sécurité pour détecter secrets, clés API, tokens, identifiants et contenu sensible du dépôt avant empaquetage."
---

# Sécurité

## Fonctionnalité de vérification de sécurité

Repomix utilise [Secretlint](https://github.com/secretlint/secretlint) pour détecter les informations sensibles dans vos fichiers:
- Clés d'API
- Jetons d'accès
- Identifiants
- Clés privées
- Variables d'environnement

## Configuration

Les vérifications de sécurité sont activées par défaut.

Désactivation via CLI:
```bash
repomix --no-security-check
```

Ou dans `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Mesures de sécurité

1. **Gestion des fichiers binaires**: Les contenus des fichiers binaires sont exclus de la sortie, mais leurs chemins sont listés dans la structure des répertoires pour une vue d'ensemble complète du dépôt
2. **Compatible avec Git**: Respecte les motifs `.gitignore`
3. **Détection automatisée**: Analyse les problèmes de sécurité courants:
    - Identifiants AWS
    - Chaînes de connexion aux bases de données
    - Jetons d'authentification
    - Clés privées

## Confiance accordée à la configuration des dépôts distants {#remote-repository-config-trust}

Lorsque vous empaquetez un dépôt distant avec `--remote`, Repomix traite la configuration de ce dépôt comme du code non fiable.

### Pourquoi un fichier de configuration est du code

Un `repomix.config.*` n'est pas une simple donnée:

- `repomix.config.ts` / `.js` / `.mjs` est **exécuté** lors de son chargement.
- `input.processors` exécute des commandes externes sur les fichiers correspondants.
- `output.instructionFilePath` et les motifs d'inclusion utilisant `../` lisent des fichiers en dehors du dépôt.

Charger une configuration non vérifiée provenant d'un dépôt inconnu revient donc à exécuter son `Makefile`, ou à faire un `npm install` sur un paquet doté de scripts de cycle de vie.

### Par défaut: les configurations distantes ne sont jamais chargées

Repomix ignore la configuration d'un dépôt cloné, sauf si vous le demandez explicitement. Votre configuration globale et vos options CLI continuent de s'appliquer. Si vous ne passez jamais le flag ci-dessous, rien dans cette section ne peut vous affecter.

### Activer l'option

```bash
# Via le flag CLI
repomix --remote user/repo --remote-trust-config

# Via une variable d'environnement
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Cela accorde à la configuration distante la même confiance qu'une configuration que vous auriez écrite vous-même. N'utilisez cette option que pour des dépôts auxquels vous faites confiance et que vous avez vérifiés.

### Invite de confirmation

Dans un terminal interactif, Repomix affiche la configuration qui est sur le point de s'exécuter et demande confirmation avant de la charger:

| Choix | Effet |
| --- | --- |
| **Oui, une seule fois** | Fait confiance uniquement à cette exécution. |
| **Oui, et ne plus demander pour ce dépôt** | Mémorise la décision (voir ci-dessous). |
| **Non** (sélection par défaut) | Abandonne sans charger la configuration. |

La configuration qui vous est présentée est écrite par l'auteur du dépôt; Repomix veille donc à ce que l'affichage ne puisse pas être manipulé:

- **Les séquences de contrôle et ANSI sont échappées**, afin qu'une configuration ne puisse pas repeindre le terminal ni faire défiler l'avertissement hors de vue.
- **Les caractères bidirectionnels et invisibles sont échappés**, afin que le texte que vous lisez soit bien celui qui s'exécute ([Trojan Source](https://trojansource.codes/)).
- **La sortie est plafonnée** à la fois en nombre de lignes et en taille en octets, afin qu'une configuration remplie de contenu ne puisse pas repousser l'avertissement hors de l'écran.
- **Chaque ligne de configuration est préfixée**, afin qu'une configuration ne puisse pas falsifier les propres séparateurs ou messages de Repomix.
- **Les liens symboliques sont refusés.** Git préserve les liens symboliques, un dépôt peut donc fournir un `repomix.config.json` qui pointe en dehors du clone. Repomix exige que la configuration soit un fichier normal à l'intérieur de l'arborescence clonée — sinon, les octets que vous avez examinés ne seraient pas ceux qui s'exécutent.

### Mémoriser une décision

Choisir « ne plus demander » enregistre un marqueur dans votre répertoire temporaire (`$TMPDIR/repomix/trusted-remotes/`), lisible et modifiable uniquement par votre compte utilisateur.

Ce marqueur est **ancré au contenu**: il enregistre un hash de la configuration que vous avez approuvée. Si ce dépôt fournit ensuite une configuration différente, le hash ne correspond plus et **la question vous est de nouveau posée** — le même principe que `direnv allow`.

::: warning Portée de l'ancrage
Le hash ne couvre que le fichier de configuration d'entrée. Une configuration `.ts` / `.js` peut `import`er d'autres fichiers, et `input.processors` peut invoquer des scripts externes; ni l'un ni l'autre n'est haché. Un dépôt déjà approuvé peut modifier ces éléments tout en laissant le fichier d'entrée identique. C'est pourquoi les configurations exécutables sont signalées comme telles dans l'invite — considérez « ne plus demander » comme une confiance accordée au dépôt, pas seulement au fichier que vous avez lu.
:::

Les marqueurs résident dans le répertoire temporaire; les décisions expirent donc lorsque votre système d'exploitation le vide. C'est voulu: une expiration vers « redemander » est la direction sûre.

### Quand l'invite est ignorée

| Situation | Comportement |
| --- | --- |
| `--force` est passé | Confiance accordée sans demander. Le flag signifie que vous en acceptez les conséquences; un avis est affiché sur stderr. |
| Shell non interactif (CI, pipes) | Confiance accordée sans demander, préservant l'automatisation existante. Un avis est affiché sur stderr. |
| Dépôt déjà approuvé | Chargé sans demander, tant que la configuration reste inchangée. |
| Un `--config` absolu est utilisé | La configuration propre du dépôt cloné n'est jamais chargée, il n'y a donc rien à confirmer. |
| Le clone ne contient aucun fichier de configuration | Rien à approuver. |

Avec `--stdout`, ou lorsque la sortie standard est redirigée, l'invite ne peut pas s'afficher. Repomix signale alors une erreur avec des indications, plutôt que de faire confiance à la configuration silencieusement.

### Recommandations

1. Laissez `--remote-trust-config` désactivé sauf si vous avez besoin de la configuration propre du dépôt.
2. Lisez la configuration affichée dans l'invite avant de répondre, en particulier `input.processors` et tout chemin `../`.
3. Privilégiez « Oui, une seule fois » pour les dépôts que vous ne contrôlez pas.
4. En CI, gardez à l'esprit que l'invite ne peut pas vous protéger — figez la révision que vous empaquetez et vérifiez-la au préalable.

## Lorsque la vérification de sécurité trouve des problèmes

Exemple de sortie:
```bash
🔍 Vérification de sécurité:
────────────────────────────
2 fichier(s) suspect(s) détecté(s) et exclu(s):
1. config/credentials.json
  - Clé d'accès AWS trouvée
2. .env.local
  - Mot de passe de base de données trouvé
```

## Meilleures pratiques

1. Toujours examiner la sortie avant de la partager
2. Utiliser `.repomixignore` pour les chemins sensibles
3. Garder les vérifications de sécurité activées
4. Supprimer les fichiers sensibles du dépôt

## Signalement des problèmes de sécurité

Vous avez trouvé une vulnérabilité de sécurité? Veuillez:
1. Ne pas ouvrir un ticket public
2. Envoyer un email à: koukun0120@gmail.com
3. Ou utiliser les [Avis de sécurité GitHub](https://github.com/yamadashy/repomix/security/advisories/new)

## Ressources associées

- [Traitement des dépôts GitHub](/fr/guide/remote-repository-processing) - Empaqueter des dépôts que vous n'avez pas clonés vous-même
- [Configuration](/fr/guide/configuration) - Configurer les vérifications de sécurité via `security.enableSecurityCheck`
- [Options de ligne de commande](/fr/guide/command-line-options) - Utiliser le flag `--no-security-check`
- [Politique de confidentialité](/fr/guide/privacy) - En savoir plus sur le traitement des données par Repomix
