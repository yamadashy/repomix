# Erste Schritte mit Repomix

Repomix ist ein Werkzeug, das Ihr gesamtes Repository in eine einzige, KI-freundliche Datei packt. Es wurde entwickelt, um Ihren Quellcode an große Sprachmodelle (LLMs) wie ChatGPT, DeepSeek, Perplexity, Gemini, Gemma, Llama, Grok und mehr zu übermitteln.

## Schnellstart

Führen Sie diesen Befehl in Ihrem Projektverzeichnis aus:

```bash
npx repomix
```

Das war's! Sie finden eine `repomix-output.xml` Datei, die Ihr gesamtes Repository in einem KI-freundlichen Format enthält.

Sie können diese Datei dann an einen KI-Assistenten senden mit einer Anweisung wie:

```
Diese Datei enthält alle Dateien des Repositories in einer Datei zusammengefasst.
Ich möchte den Code refaktorisieren, bitte überprüfe ihn zuerst.
```

Die KI wird Ihren gesamten Quellcode analysieren und umfassende Einblicke bieten:

![Repomix Dateiverwendung 1](/images/docs/repomix-file-usage-1.png)

Bei der Diskussion spezifischer Änderungen kann die KI bei der Codegenerierung helfen. Mit Funktionen wie Claudes Artifacts können Sie sogar mehrere voneinander abhängige Dateien erhalten:

![Repomix Dateiverwendung 2](/images/docs/repomix-file-usage-2.png)

Viel Spaß beim Programmieren! 🚀

## Kernfunktionen

- **KI-optimierte Ausgabe**: Formatiert Ihren Quellcode für einfache KI-Verarbeitung mit strukturierten Abschnitten und klarer Organisation
- **Token-Zählung**: Verfolgt die Token-Nutzung für LLM-Kontextgrenzen mit konfigurierbaren Tokenizern wie OpenAIs tiktoken
- **Git-bewusst**: Respektiert Ihre `.gitignore` und `.git/info/exclude` Dateien, um unerwünschte Dateien auszuschließen
- **Sicherheitsorientiert**: Erkennt sensible Informationen mit Secretlint, um versehentliche Offenlegung zu verhindern
- **Mehrere Ausgabeformate**: Wählen Sie zwischen XML (am besten für KI), Markdown (Balance zwischen Lesbarkeit und Struktur) oder Klartext
- **Code-Komprimierung**: Extrahiert intelligent wesentliche Code-Strukturen und entfernt gleichzeitig Implementierungsdetails, um die Token-Anzahl zu reduzieren

## Was kommt als Nächstes?

- [Installationsanleitung](installation.md): Verschiedene Möglichkeiten, Repomix zu installieren
- [Nutzungsanleitung](usage.md): Erfahren Sie mehr über grundlegende und fortgeschrittene Funktionen
- [Konfiguration](configuration.md): Passen Sie Repomix an Ihre Bedürfnisse an
- [Sicherheitsfunktionen](security.md): Erfahren Sie mehr über Sicherheitsprüfungen

## Community

Treten Sie unserer [Discord-Community](https://discord.gg/wNYzTwZFku) bei für:
- Hilfe mit Repomix
- Teilen Ihrer Erfahrungen
- Vorschlagen neuer Funktionen
- Verbindung mit anderen Benutzern

## Support

Haben Sie einen Fehler gefunden oder benötigen Hilfe?
- [Öffnen Sie ein Issue auf GitHub](https://github.com/yamadashy/repomix/issues)
- Treten Sie unserem Discord-Server bei
- Überprüfen Sie die [Dokumentation](https://repomix.com)
