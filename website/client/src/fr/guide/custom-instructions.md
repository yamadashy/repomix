# Instructions personnalisées

Repomix vous permet de fournir des instructions personnalisées qui seront incluses dans le fichier de sortie. Cela peut être utile pour ajouter du contexte ou des directives spécifiques pour les systèmes d'IA traitant le dépôt.

## Utilisation

Pour inclure une instruction personnalisée, créez un fichier markdown (par exemple, `repomix-instruction.md`) à la racine de votre dépôt. Ensuite, spécifiez le chemin vers ce fichier dans votre `repomix.config.json`:

```json
{
  "output": {
    "instructionFilePath": "repomix-instruction.md"
  }
}
```

Le contenu de ce fichier sera inclus dans la sortie sous la section "Instruction".

## Exemple

```markdown
# Instructions du dépôt
Ce dépôt contient le code source de l'outil Repomix. Veuillez suivre ces directives lors de l'analyse du code:
1. Concentrez-vous sur les fonctionnalités principales dans le répertoire `src/core`.
2. Portez une attention particulière aux vérifications de sécurité dans `src/core/security`.
3. Ignorez tous les fichiers dans le répertoire `tests`.
```

Cela donnera la section suivante dans la sortie:

```xml
<instruction>
# Instructions du dépôt
Ce dépôt contient le code source de l'outil Repomix. Veuillez suivre ces directives lors de l'analyse du code:
1. Concentrez-vous sur les fonctionnalités principales dans le répertoire `src/core`.
2. Portez une attention particulière aux vérifications de sécurité dans `src/core/security`.
3. Ignorez tous les fichiers dans le répertoire `tests`.
</instruction>
```

## Ressources associées

- [Configuration](/fr/guide/configuration) - Définir `output.instructionFilePath` dans le fichier de configuration
- [Formats de sortie](/fr/guide/output) - Découvrir les différents formats de sortie
- [Exemples de prompts](/fr/guide/prompt-examples) - Exemples de prompts pour l'analyse IA
- [Cas d'utilisation](/fr/guide/use-cases) - Exemples concrets d'utilisation de Repomix avec l'IA
