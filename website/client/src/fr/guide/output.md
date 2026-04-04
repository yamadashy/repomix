# Formats de sortie

Repomix prend en charge quatre formats de sortie:
- XML (par défaut)
- Markdown
- JSON
- Texte brut

## Format XML

```bash
repomix --style xml
```

Le format XML est optimisé pour le traitement par l'IA:

```xml
Ce fichier est une représentation fusionnée de toute la base de code...
<file_summary>
(Métadonnées et instructions pour l'IA)
</file_summary>
<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>
<files>
<file path="src/index.ts">
// Contenu du fichier ici
</file>
</files>

<git_logs>
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
</git_logs>
```

### Pourquoi XML comme format par défaut ?

Repomix utilise XML comme format de sortie par défaut basé sur des recherches et tests approfondis. Cette décision se fonde sur des preuves empiriques et des considérations pratiques pour l'analyse de code assistée par IA.

Notre choix de XML est principalement influencé par les recommandations officielles des principaux fournisseurs d'IA :
- **Anthropic (Claude)** : Recommande explicitement l'utilisation de balises XML pour structurer les prompts, déclarant que "Claude a été exposé à de tels prompts pendant l'entraînement" ([documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)** : Recommande les formats structurés incluant XML pour les tâches complexes ([documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)** : Préconise le prompting structuré dans les scénarios complexes ([annonce](https://x.com/OpenAIDevs/status/1890147300493914437), [cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Format Markdown

```bash
repomix --style markdown
```

Le Markdown offre un formatage lisible:

````markdown
Ce fichier est une représentation fusionnée de toute la base de code...
# Résumé du fichier
(Métadonnées et instructions pour l'IA)
# Structure des répertoires
```
src/
index.ts
utils/
helper.ts
```
# Fichiers
## Fichier: src/index.ts
```typescript
// Contenu du fichier ici
```

# Journaux Git
```
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
````

## Format JSON

```bash
repomix --style json
```

Le format JSON fournit une sortie structurée et programmatiquement accessible avec des noms de propriétés en camelCase :

```json
{
  "fileSummary": {
    "generationHeader": "Ce fichier est une représentation fusionnée de toute la base de code, combinée en un seul document par Repomix.",
    "purpose": "Ce fichier contient une représentation compactée du contenu de tout le dépôt...",
    "fileFormat": "Le contenu est organisé comme suit...",
    "usageGuidelines": "- Ce fichier doit être traité comme étant en lecture seule...",
    "notes": "- Certains fichiers peuvent avoir été exclus selon les règles .gitignore..."
  },
  "userProvidedHeader": "Texte d'en-tête personnalisé si spécifié",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// Contenu du fichier ici",
    "src/utils.js": "// Contenu du fichier ici"
  },
  "instruction": "Instructions personnalisées depuis instructionFilePath"
}
```

### Avantages du format JSON

Le format JSON est idéal pour :
- **Traitement programmatique** : Facile à analyser et manipuler avec les bibliothèques JSON dans n'importe quel langage de programmation
- **Intégration API** : Consommation directe par les services web et applications
- **Compatibilité outils IA** : Format structuré optimisé pour l'apprentissage automatique et les systèmes IA
- **Analyse de données** : Extraction simple d'informations spécifiques avec des outils comme `jq`

### Travailler avec la sortie JSON en utilisant `jq`

Le format JSON facilite l'extraction programmatique d'informations spécifiques. Voici des exemples courants :

#### Opérations de fichiers de base
```bash
# Lister tous les chemins de fichiers
cat repomix-output.json | jq -r '.files | keys[]'

# Compter le nombre total de fichiers
cat repomix-output.json | jq '.files | keys | length'

# Extraire le contenu d'un fichier spécifique
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### Filtrage et analyse de fichiers
```bash
# Trouver des fichiers par extension
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# Obtenir des fichiers contenant un texte spécifique
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# Créer une liste de fichiers avec nombre de caractères
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) caractères"'
```

#### Extraction de métadonnées
```bash
# Extraire la structure des répertoires
cat repomix-output.json | jq -r '.directoryStructure'

# Obtenir les informations du résumé de fichier
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# Extraire l'en-tête fourni par l'utilisateur (s'il existe)
cat repomix-output.json | jq -r '.userProvidedHeader // "Aucun en-tête fourni"'

# Obtenir les instructions personnalisées
cat repomix-output.json | jq -r '.instruction // "Aucune instruction fournie"'
```

#### Analyse avancée
```bash
# Trouver les plus gros fichiers par longueur de contenu
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# Rechercher des fichiers contenant des motifs spécifiques
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# Extraire les chemins de fichiers correspondant à plusieurs extensions
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## Format texte brut

```bash
repomix --style plain
```

Structure de sortie:

```text
Ce fichier est une représentation fusionnée de toute la base de code...
================
Résumé du fichier
================
(Métadonnées et instructions pour l'IA)
================
Structure des répertoires
================
src/
  index.ts
  utils/
    helper.ts
================
Fichiers
================
================
Fichier: src/index.ts
================
// Contenu du fichier ici

================
Journaux Git
================
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```

## Utilisation avec les modèles d'IA

Chaque format fonctionne bien avec les modèles d'IA, mais considérez :
- Utilisez XML pour Claude (meilleure précision d'analyse)
- Utilisez Markdown pour une meilleure lisibilité générale
- Utilisez JSON pour le traitement programmatique et l'intégration API
- Utilisez le texte brut pour la simplicité et une compatibilité universelle

## Personnalisation

Définissez le format par défaut dans `repomix.config.json`:

```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}

## Ressources associées

- [Configuration](/fr/guide/configuration) - Référence complète des options de configuration
- [Options de ligne de commande](/fr/guide/command-line-options) - Utiliser `--style` pour définir le format de sortie
- [Compression de code](/fr/guide/code-compress) - Réduire le nombre de tokens tout en préservant la structure
- [Exemples de prompts](/fr/guide/prompt-examples) - Conseils pour utiliser la sortie avec différents modèles IA
```
