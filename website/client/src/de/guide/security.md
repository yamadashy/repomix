---
title: "Sicherheit"
description: "Erfahren Sie, wie Repomix Secretlint und Sicherheitsprüfungen nutzt, um Secrets, API-Schlüssel, Tokens, Zugangsdaten und sensible Repository-Inhalte vor dem Packen zu erkennen."
---

# Sicherheit

## Sicherheitsprüfungsfunktion

Repomix verwendet [Secretlint](https://github.com/secretlint/secretlint) zur Erkennung sensibler Informationen in Ihren Dateien:
- API-Schlüssel
- Zugangstoken
- Anmeldedaten
- Private Schlüssel
- Umgebungsvariablen

## Konfiguration

Sicherheitsprüfungen sind standardmäßig aktiviert.

Deaktivierung über CLI:
```bash
repomix --no-security-check
```

Oder in `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Sicherheitsmaßnahmen

1. **Binärdateiverarbeitung**: Binärdateiinhalte werden von der Ausgabe ausgeschlossen, aber ihre Pfade werden in der Verzeichnisstruktur für eine vollständige Repository-Übersicht aufgelistet
2. **Git-bewusst**: Berücksichtigt `.gitignore`-Muster
3. **Automatische Erkennung**: Sucht nach häufigen Sicherheitsproblemen:
  - AWS-Anmeldedaten
  - Datenbankverbindungszeichenfolgen
  - Authentifizierungstoken
  - Private Schlüssel

## Vertrauen in die Konfiguration von Remote-Repositories {#remote-repository-config-trust}

Wenn Sie ein Remote-Repository mit `--remote` packen, behandelt Repomix die Konfiguration dieses Repositorys als nicht vertrauenswürdigen Code.

### Warum eine Konfigurationsdatei Code ist

Eine `repomix.config.*` ist nicht nur Daten:

- `repomix.config.ts` / `.js` / `.mjs` wird beim Laden **ausgeführt**.
- `input.processors` führt externe Befehle für passende Dateien aus.
- `output.instructionFilePath` und Include-Muster mit `../` lesen Dateien außerhalb des Repositorys.

Eine ungeprüfte Konfiguration aus einem unbekannten Repository zu laden, ist daher vergleichbar mit dem Ausführen von dessen `Makefile` oder einem `npm install` für ein Paket mit Lifecycle-Skripten.

### Standard: Remote-Konfigurationen werden nie geladen

Repomix ignoriert die Konfiguration eines geklonten Repositorys, sofern Sie nicht explizit danach fragen. Ihre globale Konfiguration und CLI-Optionen gelten weiterhin. Solange Sie das unten genannte Flag nicht übergeben, kann Sie nichts in diesem Abschnitt betreffen.

### Aktivieren

```bash
# Per CLI-Flag
repomix --remote user/repo --remote-trust-config

# Per Umgebungsvariable
REPOMIX_REMOTE_TRUST_CONFIG=true repomix --remote user/repo
```

Dies gewährt der Remote-Konfiguration das gleiche Vertrauen wie einer selbst geschriebenen Konfiguration. Verwenden Sie diese Option nur für Repositories, denen Sie vertrauen und die Sie überprüft haben.

### Bestätigungsaufforderung

In einem interaktiven Terminal zeigt Repomix die Konfiguration an, die gleich ausgeführt wird, und fragt vor dem Laden nach Bestätigung:

| Auswahl | Wirkung |
| --- | --- |
| **Ja, nur dieses Mal** | Vertraut nur diesem Durchlauf. |
| **Ja, und nicht mehr für dieses Repository fragen** | Speichert die Entscheidung (siehe unten). |
| **Nein** (Standardauswahl) | Bricht ab, ohne die Konfiguration zu laden. |

Die angezeigte Konfiguration wurde vom Autor des Repositorys geschrieben, daher stellt Repomix sicher, dass die Anzeige nicht manipuliert werden kann:

- **Steuer- und ANSI-Sequenzen werden maskiert**, sodass eine Konfiguration das Terminal nicht neu zeichnen oder die Warnung aus dem Sichtbereich scrollen kann.
- **Bidirektionale und unsichtbare Zeichen werden maskiert**, sodass der gelesene Text dem ausgeführten Text entspricht ([Trojan Source](https://trojansource.codes/)).
- **Die Ausgabe ist begrenzt** – sowohl nach Zeilenanzahl als auch nach Byte-Größe –, sodass eine aufgeblähte Konfiguration die Warnung nicht aus dem Bildschirm drängen kann.
- **Jeder Konfigurationszeile wird ein Präfix vorangestellt**, sodass eine Konfiguration Repomix' eigene Trennzeichen oder Meldungen nicht fälschen kann.
- **Symlinks werden abgelehnt.** Git bewahrt Symlinks, sodass ein Repository eine `repomix.config.json` ausliefern kann, die auf einen Ort außerhalb des Klons zeigt. Repomix verlangt, dass die Konfiguration eine reguläre Datei innerhalb des geklonten Verzeichnisbaums ist – andernfalls wären die überprüften Bytes nicht die Bytes, die ausgeführt werden.

### Eine Entscheidung merken

Die Wahl von "nicht mehr fragen" speichert einen Marker in Ihrem temporären Verzeichnis (`$TMPDIR/repomix/trusted-remotes/`), der nur für Ihr Benutzerkonto lesbar und beschreibbar ist.

Der Marker ist **inhaltsgebunden**: Er speichert einen Hash der genehmigten Konfiguration. Liefert das Repository später eine andere Konfiguration aus, stimmt der Hash nicht mehr überein und **Sie werden erneut gefragt** – nach demselben Prinzip wie `direnv allow`.

::: warning Umfang der Bindung
Der Hash deckt nur die Einstiegs-Konfigurationsdatei ab. Eine `.ts`- / `.js`-Konfiguration kann andere Dateien per `import` einbinden, und `input.processors` kann externe Skripte aufrufen; beides wird nicht gehasht. Ein bereits vertrautes Repository kann diese ändern, während die Einstiegsdatei identisch bleibt. Deshalb werden ausführbare Konfigurationen in der Aufforderung entsprechend gekennzeichnet – betrachten Sie "nicht mehr fragen" als Vertrauen in das Repository, nicht nur in die gelesene Datei.
:::

Marker liegen im temporären Verzeichnis, sodass Entscheidungen verfallen, sobald Ihr Betriebssystem es leert. Das ist beabsichtigt: Ein Verfall in Richtung "erneut fragen" ist die sichere Richtung.

### Wann die Aufforderung übersprungen wird

| Situation | Verhalten |
| --- | --- |
| `--force` wird übergeben | Vertraut, ohne zu fragen. Das Flag bedeutet, dass Sie die Konsequenzen akzeptieren; ein Hinweis wird auf stderr ausgegeben. |
| Nicht-interaktive Shell (CI, Pipes) | Vertraut, ohne zu fragen, bestehende Automatisierung bleibt erhalten. Ein Hinweis wird auf stderr ausgegeben. |
| Repository bereits vertraut | Wird ohne Nachfrage geladen, solange die Konfiguration unverändert ist. |
| Ein absoluter `--config`-Pfad wird verwendet | Die eigene Konfiguration des geklonten Repositorys wird nie geladen, daher gibt es nichts zu bestätigen. |
| Der Klon enthält keine Konfigurationsdatei | Nichts zu vertrauen. |

Unter `--stdout`, oder wenn stdout umgeleitet wird, kann die Aufforderung nicht angezeigt werden. Repomix meldet stattdessen einen Fehler mit Hinweisen, statt die Konfiguration stillschweigend zu vertrauen.

### Empfehlungen

1. Lassen Sie `--remote-trust-config` deaktiviert, sofern Sie nicht die eigene Konfiguration des Repositorys benötigen.
2. Lesen Sie die in der Aufforderung angezeigte Konfiguration, bevor Sie antworten, besonders `input.processors` und alle `../`-Pfade.
3. Bevorzugen Sie "Ja, nur dieses Mal" für Repositories, die Sie nicht selbst kontrollieren.
4. Denken Sie in CI daran, dass die Aufforderung Sie nicht schützen kann – fixieren Sie die gepackte Revision und prüfen Sie sie vorher.

## Wenn die Sicherheitsprüfung Probleme findet

Beispielausgabe:
```bash
🔍 Sicherheitsprüfung:
──────────────────
2 verdächtige Datei(en) erkannt und ausgeschlossen:
1. config/credentials.json
  - AWS-Zugriffsschlüssel gefunden
2. .env.local
  - Datenbank-Passwort gefunden
```

## Best Practices

1. Überprüfen Sie die Ausgabe immer vor dem Teilen
2. Verwenden Sie `.repomixignore` für sensible Pfade
3. Lassen Sie Sicherheitsprüfungen aktiviert
4. Entfernen Sie sensible Dateien aus dem Repository

## Melden von Sicherheitsproblemen

Haben Sie eine Sicherheitslücke gefunden? Bitte:
1. Öffnen Sie kein öffentliches Issue
2. E-Mail: koukun0120@gmail.com
3. Oder nutzen Sie [GitHub Security Advisories](https://github.com/yamadashy/repomix/security/advisories/new)

## Verwandte Ressourcen

- [GitHub-Repository-Verarbeitung](/de/guide/remote-repository-processing) - Repositories packen, die Sie nicht selbst geklont haben
- [Konfiguration](/de/guide/configuration) - Sicherheitsprüfungen über `security.enableSecurityCheck` konfigurieren
- [Befehlszeilenoptionen](/de/guide/command-line-options) - `--no-security-check`-Flag verwenden
- [Datenschutzrichtlinie](/de/guide/privacy) - Erfahren Sie mehr über Repomix' Datenverarbeitung
