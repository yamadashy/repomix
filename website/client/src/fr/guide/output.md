# Formats de Sortie

Repomix prend en charge trois formats de sortie:
- XML (par défaut): Format le plus structuré, idéal pour les outils d'IA comme Claude qui analysent efficacement le XML
- Markdown: Équilibre entre lisibilité et structure, parfait pour GitHub et les flux de travail orientés documents
- Texte brut: Format le plus simple avec une compatibilité universelle sur tous les outils et plateformes

## Format XML

```bash
repomix --style xml
```

Le format XML est optimisé pour le traitement par l'IA avec des sections et une structure clairement définies:

```xml
Ce fichier est une représentation fusionnée de l'ensemble du code source...

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
```

::: tip Pourquoi XML?
Les balises XML aident les modèles d'IA comme Claude à analyser le contenu avec plus de précision. La documentation de Claude [recommande l'utilisation de balises XML](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) pour les prompts structurés, facilitant la compréhension des différentes sections de votre code par le modèle.
:::

## Format Markdown

```bash
repomix --style markdown
```

Le Markdown offre un formatage lisible:

```markdown
Ce fichier est une représentation fusionnée de l'ensemble du code source...

# Résumé du Fichier
(Métadonnées et instructions pour l'IA)

# Structure des Répertoires
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
```

## Utilisation avec les Modèles d'IA

Chaque format fonctionne bien avec les modèles d'IA, mais considérez:
- Utilisez XML pour Claude et autres modèles d'IA qui préfèrent les entrées structurées avec une délimitation claire des sections
- Utilisez Markdown pour une lisibilité générale et lors du partage avec des humains parallèlement à l'analyse par l'IA
- Utilisez le Texte brut pour la simplicité, la compatibilité universelle et lorsque vous travaillez avec des outils qui n'analysent pas le balisage

## Personnalisation

Définissez le format par défaut dans `repomix.config.json`:
```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```

## Format Texte Brut

```bash
repomix --style plain
```

Structure de sortie:
```text
Ce fichier est une représentation fusionnée de l'ensemble du code source...

================
Résumé du Fichier
================
(Métadonnées et instructions pour l'IA)

================
Structure des Répertoires
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
```
