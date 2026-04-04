# Benutzerdefinierte Anweisungen

Repomix ermöglicht es Ihnen, benutzerdefinierte Anweisungen bereitzustellen, die in die Ausgabedatei aufgenommen werden. Dies kann nützlich sein, um Kontext oder spezifische Richtlinien für KI-Systeme hinzuzufügen, die das Repository verarbeiten.

## Verwendung

Um eine benutzerdefinierte Anweisung einzufügen, erstellen Sie eine Markdown-Datei (z.B. `repomix-instruction.md`) im Stammverzeichnis Ihres Repositories. Geben Sie dann den Pfad zu dieser Datei in Ihrer `repomix.config.json` an:

```json
{
  "output": {
    "instructionFilePath": "repomix-instruction.md"
  }
}
```

Der Inhalt dieser Datei wird in der Ausgabe unter dem Abschnitt "Instruction" aufgenommen.

## Beispiel

```markdown
# Repository-Anweisungen

Dieses Repository enthält den Quellcode für das Repomix-Tool. Bitte beachten Sie diese Richtlinien bei der Analyse des Codes:

1. Konzentrieren Sie sich auf die Kernfunktionalität im Verzeichnis `src/core`.
2. Achten Sie besonders auf die Sicherheitsprüfungen in `src/core/security`.
3. Ignorieren Sie alle Dateien im Verzeichnis `tests`.
```

Dies führt zu folgendem Abschnitt in der Ausgabe:

```xml
<instruction>
# Repository-Anweisungen

Dieses Repository enthält den Quellcode für das Repomix-Tool. Bitte beachten Sie diese Richtlinien bei der Analyse des Codes:

1. Konzentrieren Sie sich auf die Kernfunktionalität im Verzeichnis `src/core`.
2. Achten Sie besonders auf die Sicherheitsprüfungen in `src/core/security`.
3. Ignorieren Sie alle Dateien im Verzeichnis `tests`.
</instruction>
```

## Verwandte Ressourcen

- [Konfiguration](/de/guide/configuration) - `output.instructionFilePath` in der Konfigurationsdatei setzen
- [Ausgabeformate](/de/guide/output) - Die verschiedenen Ausgabeformate kennenlernen
- [Prompt-Beispiele](/de/guide/prompt-examples) - Beispiel-Prompts für KI-Analyse
- [Anwendungsfälle](/de/guide/use-cases) - Praxisbeispiele für die Verwendung von Repomix mit KI
