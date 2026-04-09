# Suppression des commentaires

Repomix peut automatiquement supprimer les commentaires de votre base de code lors de la génération du fichier de sortie. Cela peut aider à réduire le bruit et à se concentrer sur le code réel.

## Utilisation

Pour activer la suppression des commentaires, définissez l'option `removeComments` sur `true` dans votre `repomix.config.json`:

```json
{
  "output": {
    "removeComments": true
  }
}
```

## Langages pris en charge

Repomix prend en charge la suppression des commentaires pour une large gamme de langages de programmation, notamment:

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- Et bien d'autres...

## Exemple

Considérons le code JavaScript suivant:

```javascript
// Ceci est un commentaire sur une ligne
function test() {
  /* Ceci est un
     commentaire sur
     plusieurs lignes */
  return true;
}
```

Avec la suppression des commentaires activée, la sortie sera:

```javascript
function test() {
  return true;
}
```

## Remarques

- La suppression des commentaires est effectuée avant les autres étapes de traitement, comme l'ajout de numéros de ligne.
- Certains commentaires, comme les commentaires JSDoc, peuvent être préservés selon le langage et le contexte.

## Ressources associées

- [Compression de code](/fr/guide/code-compress) - Réduire davantage le nombre de tokens en extrayant la structure du code
- [Configuration](/fr/guide/configuration) - Définir `output.removeComments` dans le fichier de configuration
- [Options de ligne de commande](/fr/guide/command-line-options) - Utiliser le flag `--remove-comments`
