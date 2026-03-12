---
layout: home
title: Repomix
titleTemplate: Ihre Codebasis in KI-freundliche Formate verpacken
aside: false
editLink: false

features:
  - icon: 🤖
    title: KI-Optimiert
    details: Formatiert Ihren Codebase so, dass er für KI leicht zu verstehen und zu verarbeiten ist.

  - icon: ⚙️
    title: Git-kompatibel
    details: Berücksichtigt automatisch Ihre .gitignore-Dateien.

  - icon: 🛡️
    title: Sicherheitsorientiert
    details: Integriert Secretlint für robuste Sicherheitsprüfungen zur Erkennung und Verhinderung der Aufnahme sensibler Informationen.

  - icon: 📊
    title: Token-Zählung
    details: Bietet Token-Zählungen für jede Datei und das gesamte Repository, nützlich für LLM-Kontextgrenzen.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Nominierung für die Open Source Awards

Wir fühlen uns geehrt! Repomix wurde in der Kategorie **Powered by AI** für die [JSNation Open Source Awards 2025](https://osawards.com/javascript/) nominiert.

Dies wäre ohne Sie alle, die Repomix nutzen und unterstützen, nicht möglich gewesen. Vielen Dank!

## Was ist Repomix?

Repomix ist ein leistungsstarkes Tool, das Ihre gesamte Codebasis in eine einzige, KI-freundliche Datei verpackt. Ob Code-Review, Refactoring oder KI-gestützte Projektunterstützung – mit Repomix teilen Sie den gesamten Repository-Kontext ganz einfach mit KI-Tools.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Schnellstart

Sobald Sie mit Repomix eine gepackte Datei (`repomix-output.xml`) erstellt haben, können Sie diese mit einer Aufforderung wie dieser an einen KI-Assistenten (wie ChatGPT, Claude) senden:

```
Diese Datei enthält alle Dateien im Repository in einer Datei zusammengefasst.
Ich möchte den Code refaktorieren, bitte überprüfen Sie ihn zuerst.
```

Die KI wird Ihren gesamten Codebase analysieren und umfassende Einblicke geben:

![Repomix File Usage 1](/images/docs/repomix-file-usage-1.png)

Bei der Diskussion spezifischer Änderungen kann die KI bei der Code-Generierung helfen. Mit Funktionen wie Claudes Artifacts können Sie sogar mehrere voneinander abhängige Dateien erhalten:

![Repomix File Usage 2](/images/docs/repomix-file-usage-2.png)

Viel Spaß beim Programmieren! 🚀

## Warum Repomix?

Repomix funktioniert mit Diensten wie ChatGPT, Claude, Gemini oder Grok – ganz ohne zusätzliche Kosten für Repomix selbst. Da der vollständige Codebasis-Kontext bereitgestellt wird, entfällt das mühsame Durchsuchen einzelner Dateien, was die Analyse schneller und präziser macht.

Mit der gesamten Codebasis als Kontext eröffnet Repomix vielfältige Einsatzmöglichkeiten: Implementierungsplanung, Fehleranalyse, Sicherheitsprüfungen von Drittanbieter-Bibliotheken, Dokumentationserstellung und vieles mehr.

## Verwendung des CLI-Tools {#using-the-cli-tool}

Repomix lässt sich als Kommandozeilen-Tool nutzen und bietet vielseitige Funktionen sowie flexible Anpassungsmöglichkeiten.

**Das CLI-Tool kann auf private Repositories zugreifen**, da es Ihr lokal installiertes Git verwendet.

### Schnellstart

Sie können Repomix sofort in Ihrem Projektverzeichnis ohne Installation ausprobieren:

```bash
npx repomix@latest
```

Oder installieren Sie es global für wiederholte Verwendung:

```bash
# Installation mit npm
npm install -g repomix

# Alternativ mit yarn
yarn global add repomix

# Alternativ mit bun
bun add -g repomix

# Alternativ mit Homebrew (macOS/Linux)
brew install repomix

# Dann in einem beliebigen Projektverzeichnis ausführen
repomix
```

Das war's! Repomix generiert eine `repomix-output.xml` Datei in Ihrem aktuellen Verzeichnis, die Ihr gesamtes Repository in einem KI-freundlichen Format enthält.

### Verwendung

Um Ihr gesamtes Repository zu packen:

```bash
repomix
```

Um ein bestimmtes Verzeichnis zu packen:

```bash
repomix path/to/directory
```

Um bestimmte Dateien oder Verzeichnisse mit [Glob-Mustern](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) zu packen:

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Um bestimmte Dateien oder Verzeichnisse auszuschließen:

```bash
repomix --ignore "**/*.log,tmp/"
```

Um ein Remote-Repository zu packen:
```bash
# Kurzform verwenden
npx repomix --remote yamadashy/repomix

# Vollständige URL verwenden (unterstützt Branches und spezifische Pfade)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Commit-URL verwenden
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

Um eine neue Konfigurationsdatei (`repomix.config.json`) zu initialisieren:

```bash
repomix --init
```

Sobald Sie die gepackte Datei erstellt haben, können Sie sie mit generativen KI-Tools wie Claude, ChatGPT und Gemini verwenden.

#### Docker-Verwendung

Sie können Repomix auch mit Docker ausführen 🐳  
Dies ist nützlich, wenn Sie Repomix in einer isolierten Umgebung ausführen oder Container bevorzugen.

Grundlegende Verwendung (aktuelles Verzeichnis):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Um ein bestimmtes Verzeichnis zu packen:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Ein Remote-Repository verarbeiten und in ein `output`-Verzeichnis ausgeben:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Ausgabeformate

Wählen Sie Ihr bevorzugtes Ausgabeformat:

```bash
# XML-Format (Standard)
repomix --style xml

# Markdown-Format
repomix --style markdown

# JSON-Format
repomix --style json

# Klartext-Format
repomix --style plain
```

### Anpassung

Erstellen Sie eine `repomix.config.json` für dauerhafte Einstellungen:

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

## Anwendungsfälle aus der Praxis

### [LLM Code-Generierungs-Workflow](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

Ein Entwickler teilt, wie er Repomix verwendet, um Code-Kontext aus bestehenden Codebasen zu extrahieren und diesen Kontext dann mit LLMs wie Claude und Aider für inkrementelle Verbesserungen, Code-Reviews und automatisierte Dokumentationsgenerierung nutzt.

### [Erstellung von Wissensdatenpaketen für LLMs](https://lethain.com/competitive-advantage-author-llms/)

Autoren verwenden Repomix, um ihre schriftlichen Inhalte – Blogs, Dokumentationen und Bücher – in LLM-kompatible Formate zu verpacken, wodurch Leser über KI-gestützte Q&A-Systeme mit ihrer Expertise interagieren können.

[Weitere Anwendungsfälle entdecken →](./guide/use-cases)

## Power-User-Leitfaden

Repomix bietet leistungsstarke Funktionen für fortgeschrittene Anwendungsfälle. Hier sind einige wichtige Leitfäden für Power-User:

- **[MCP-Server](./guide/mcp-server)** - Model Context Protocol-Integration für KI-Assistenten
- **[GitHub Actions](./guide/github-actions)** - Automatisierung der Codebase-Paketierung in CI/CD-Workflows
- **[Code-Komprimierung](./guide/code-compress)** - Tree-sitter-basierte intelligente Komprimierung (~70% Token-Reduktion)
- **[Als Bibliothek verwenden](./guide/development/using-repomix-as-a-library)** - Repomix in Node.js-Anwendungen integrieren
- **[Benutzerdefinierte Anweisungen](./guide/custom-instructions)** - Benutzerdefinierte Prompts und Anweisungen zu Ausgaben hinzufügen
- **[Sicherheitsfunktionen](./guide/security)** - Eingebaute Secretlint-Integration und Sicherheitsprüfungen
- **[Best Practices](./guide/tips/best-practices)** - KI-Workflows mit bewährten Strategien optimieren

### Weitere Beispiele
::: tip Benötigen Sie weitere Hilfe? 💡
Schauen Sie sich unseren [Leitfaden](./guide/) für detaillierte Anleitungen an oder besuchen Sie das [GitHub-Repository](https://github.com/yamadashy/repomix) für weitere Beispiele und Quellcode.
:::

</div>        
