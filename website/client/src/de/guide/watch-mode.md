---
title: Watch-Modus
description: Packen Sie Ihre Codebasis bei Dateiänderungen automatisch neu mit dem Watch-Modus von Repomix, inklusive Debouncing, Ignore-Behandlung und Optionskompatibilität.
---

# Watch-Modus

Repomix kann Ihre Codebasis beobachten und automatisch neu packen, sobald sich Dateien ändern. Dadurch bleibt die Ausgabedatei während der Arbeit stets aktuell, was praktisch ist, wenn Sie einem KI-Assistenten einen kontinuierlich aktualisierten Snapshot bereitstellen möchten.

## Verwendung

Starten Sie den Watch-Modus mit dem Flag `-w` (oder `--watch`):

```bash
repomix --watch
```

Repomix führt einen ersten Packvorgang durch, läuft danach weiter und packt bei jeder Änderung neu. Sie können den Watch-Modus mit den üblichen Optionen kombinieren:

```bash
# Eine bestimmte Menge an Dateien beobachten
repomix -w --include "src/**/*.ts"

# Mit einer benutzerdefinierten Ausgabedatei und einem Format beobachten
repomix --watch -o output.md --style markdown
```

Drücken Sie `Ctrl+C`, um die Beobachtung zu beenden.

## Funktionsweise

- **Erster Packvorgang**: Repomix packt die Codebasis einmal und meldet anschließend, wie viele Dateien beobachtet werden.
- **Änderungserkennung**: Neue, geänderte und gelöschte Dateien lösen jeweils ein erneutes Packen aus.
- **Debouncing**: Schnelle Folgen von Änderungen (zum Beispiel beim Wechseln von Branches oder beim gleichzeitigen Speichern vieler Dateien) werden zusammengefasst. Repomix wartet nach der letzten Änderung 300 ms, bevor erneut gepackt wird, sodass eine Reihe von Bearbeitungen zu einem einzigen Neuaufbau führt.
- **Zeitstempel**: Nach jedem Neuaufbau gibt Repomix einen Zeitstempel aus (`Rebuilt at HH:MM:SS`), damit Sie erkennen können, wann die Ausgabe zuletzt aktualisiert wurde.

## Ignorierte Dateien

Der Watch-Modus berücksichtigt dieselben Ignore-Regeln wie ein normaler Lauf: `.gitignore`, `.repomixignore`, die integrierten Standardmuster (etwa `node_modules` und `.git`) sowie alle `--ignore`-Muster, die Sie übergeben. Ignorierte Verzeichnisse werden nicht beobachtet, wodurch der Watch-Modus auch bei großen Projekten effizient bleibt.

## Optionskompatibilität

Der Watch-Modus funktioniert nur mit lokalen Verzeichnissen und kann daher nicht mit den folgenden Optionen kombiniert werden (egal ob Sie sie auf der Kommandozeile oder in Ihrer Konfigurationsdatei festlegen):

- `--remote` oder eine positionale Remote-Repository-URL: Der Watch-Modus ist ausschließlich lokal.
- `--stdout` oder `--stdin`: Streaming-Modi haben keine persistente Ausgabedatei zum Aktualisieren.
- `--split-output`
- `--skill-generate`
- `--copy`: Ein erneutes Packen bei jeder Änderung würde die Zwischenablage wiederholt überschreiben.

Wenn Sie eine dieser Optionen mit `--watch` kombinieren, beendet sich Repomix mit einem Fehler, der den Konflikt erklärt.

## Verwandte Ressourcen

- [Kommandozeilenoptionen](/de/guide/command-line-options) - Vollständige CLI-Referenz, einschließlich `--watch`
- [Grundlegende Verwendung](/de/guide/usage) - Weitere Möglichkeiten, Repomix auszuführen
- [Konfiguration](/de/guide/configuration) - Standardausgabeoptionen in Ihrer Konfigurationsdatei festlegen
