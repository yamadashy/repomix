# Sécurité

## Fonctionnalité de Vérification de Sécurité

Repomix utilise [Secretlint](https://github.com/secretlint/secretlint) pour détecter les informations sensibles dans vos fichiers, notamment:
- Clés API et jetons d'accès
- Identifiants d'authentification
- Clés privées et certificats
- Chaînes de connexion aux bases de données
- Variables d'environnement contenant des secrets
- Données personnelles ou sensibles

## Configuration

Les vérifications de sécurité sont activées par défaut.

Désactiver via CLI:
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

## Mesures de Sécurité

1. **Exclusion des Fichiers Binaires**: Les fichiers binaires ne sont pas inclus dans la sortie pour réduire la taille des fichiers et empêcher la fuite de données sensibles
2. **Compatible avec Git**: Respecte les modèles `.gitignore` pour éviter d'inclure des fichiers sensibles déjà marqués pour exclusion
3. **Détection Automatisée**: Analyse les problèmes de sécurité courants:
  - Identifiants AWS et clés d'accès
  - Chaînes de connexion aux bases de données et mots de passe
  - Jetons d'authentification et identifiants OAuth
  - Clés privées et certificats
  - Variables d'environnement contenant des informations sensibles

## Lorsque la Vérification de Sécurité Trouve des Problèmes

Exemple de sortie:
```bash
🔍 Vérification de Sécurité:
──────────────────
2 fichier(s) suspect(s) détecté(s) et exclu(s):
1. config/credentials.json
  - Clé d'accès AWS trouvée
2. .env.local
  - Mot de passe de base de données trouvé
```

## Bonnes Pratiques

1. Toujours examiner la sortie avant de la partager avec des services d'IA
2. Utiliser `.repomixignore` pour les chemins sensibles supplémentaires
3. Garder les vérifications de sécurité activées sauf si absolument nécessaire de les désactiver
4. Supprimer les fichiers sensibles du dépôt ou les ajouter aux modèles d'ignorance

## Signaler des Problèmes de Sécurité

Vous avez trouvé une vulnérabilité de sécurité? Veuillez:
1. Ne pas ouvrir un problème public
2. Email: koukun0120@gmail.com
3. Ou utiliser [GitHub Security Advisories](https://github.com/yamadashy/repomix/security/advisories/new)
