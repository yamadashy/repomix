# Repomix Explorer Skill (Agent Skills)

Repomix bietet einen sofort einsatzbereiten **Repomix Explorer** Skill, der KI-Codierungsassistenten ermöglicht, Codebasen mit der Repomix CLI zu analysieren und zu erkunden.

Dieser Skill ist für verschiedene KI-Tools konzipiert, darunter Claude Code, Cursor, Codex, GitHub Copilot und mehr.

## Schnellinstallation

```bash
npx add-skill yamadashy/repomix --skill repomix-explorer
```

Dieser Befehl installiert den Skill in das Skills-Verzeichnis Ihres KI-Assistenten (z.B. `.claude/skills/`) und macht ihn sofort verfügbar.

## Was er kann

Nach der Installation können Sie Codebasen mit natürlichen Sprachanweisungen analysieren.

#### Remote-Repositories analysieren

```text
"What's the structure of this repo?
https://github.com/facebook/react"
```

#### Lokale Codebasen erkunden

```text
"What's in this project?
~/projects/my-app"
```

Dies ist nicht nur nützlich zum Verstehen von Codebasen, sondern auch wenn Sie Features implementieren möchten, indem Sie Ihre anderen Repositories als Referenz verwenden.

## Funktionsweise

Der Repomix Explorer Skill führt KI-Assistenten durch den kompletten Workflow:

1. **Repomix-Befehle ausführen** - Repositories in KI-freundliches Format packen
2. **Ausgabedateien analysieren** - Mustersuche (grep) verwenden, um relevanten Code zu finden
3. **Erkenntnisse liefern** - Struktur, Metriken und umsetzbare Empfehlungen berichten

## Anwendungsbeispiele

### Eine neue Codebasis verstehen

```text
"I want to understand the architecture of this project.
https://github.com/vercel/next.js"
```

Die KI führt repomix aus, analysiert die Ausgabe und liefert einen strukturierten Überblick über die Codebasis.

### Bestimmte Muster finden

```text
"Find all authentication-related code in this repository."
```

Die KI sucht nach Authentifizierungsmustern, kategorisiert Funde nach Datei und erklärt, wie die Authentifizierung implementiert ist.

### Eigene Projekte referenzieren

```text
"I want to implement a similar feature to what I did in my other project.
~/projects/my-other-app"
```

Die KI analysiert Ihr anderes Repository und hilft Ihnen, Ihre eigenen Implementierungen als Referenz zu nutzen.

## Skill-Inhalt

Der Skill enthält:

- **Benutzerabsichtserkennung** - Versteht verschiedene Arten, wie Benutzer nach Codebasis-Analysen fragen
- **Repomix-Befehlsanleitung** - Weiß, welche Optionen zu verwenden sind (`--compress`, `--include`, etc.)
- **Analyse-Workflow** - Strukturierter Ansatz zur Erkundung gepackter Ausgaben
- **Best Practices** - Effizienztipps wie grep vor dem Lesen ganzer Dateien zu verwenden

## Verwandte Ressourcen

- [Agent Skills Generation](/de/guide/agent-skills-generation) - Eigene Skills aus Codebasen generieren
- [Claude Code Plugins](/de/guide/claude-code-plugins) - Repomix-Plugins für Claude Code
- [MCP Server](/de/guide/mcp-server) - Alternative Integrationsmethode
