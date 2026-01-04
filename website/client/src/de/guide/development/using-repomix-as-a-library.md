# Repomix als Bibliothek verwenden

Neben der Verwendung von Repomix als CLI-Tool können Sie seine Funktionalität direkt in Ihre Node.js-Anwendungen integrieren.

## Installation

Installieren Sie Repomix als Abhängigkeit in Ihrem Projekt:

```bash
npm install repomix
```

## Grundlegende Verwendung

Der einfachste Weg, Repomix zu verwenden, ist über die Funktion `runCli`, die die gleiche Funktionalität wie die Befehlszeilenschnittstelle bietet:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Aktuelles Verzeichnis mit benutzerdefinierten Optionen verarbeiten
async function packProject() {
  const options = {
    output: 'output.xml',
    style: 'xml',
    compress: true,
    quiet: true
  } as CliOptions;
  
  const result = await runCli(['.'], process.cwd(), options);
  return result.packResult;
}
```

Das `result.packResult` enthält Informationen über die verarbeiteten Dateien, darunter:
- `totalFiles`: Anzahl der verarbeiteten Dateien
- `totalCharacters`: Gesamtanzahl der Zeichen
- `totalTokens`: Gesamtanzahl der Tokens (nützlich für LLM-Kontextgrenzen)
- `fileCharCounts`: Zeichenanzahl pro Datei
- `fileTokenCounts`: Token-Anzahl pro Datei

## Verarbeitung von Remote-Repositories

Sie können ein Remote-Repository klonen und verarbeiten:

```javascript
import { runCli, type CliOptions } from 'repomix';

// GitHub-Repository klonen und verarbeiten
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;
  
  return await runCli(['.'], process.cwd(), options);
}
```

## Verwendung der Kernkomponenten

Für mehr Kontrolle können Sie die Low-Level-APIs von Repomix direkt verwenden:

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // Dateien suchen und sammeln
  const { filePaths } = await searchFiles(directory, { /* Konfiguration */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* Konfiguration */ });
  
  // Tokens zählen
  const tokenCounter = new TokenCounter('o200k_base');
  
  // Analyseergebnisse zurückgeben
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## Bündelung

Beim Bündeln von Repomix mit Tools wie Rolldown oder esbuild müssen einige Abhängigkeiten extern bleiben und WASM-Dateien müssen kopiert werden:

**Externe Abhängigkeiten (können nicht gebündelt werden):**
- `tinypool` - Startet Worker-Threads unter Verwendung von Dateipfaden
- `tiktoken` - Lädt WASM-Dateien dynamisch zur Laufzeit

**Zu kopierende WASM-Dateien:**
- `web-tree-sitter.wasm` → Gleiches Verzeichnis wie das gebündelte JS (erforderlich für die Code-Komprimierungsfunktion)
- Tree-sitter-Sprachdateien → Verzeichnis, das durch die Umgebungsvariable `REPOMIX_WASM_DIR` angegeben wird

Ein funktionierendes Beispiel finden Sie unter [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs).

## Reales Beispiel

Die Repomix-Website ([repomix.com](https://repomix.com)) verwendet Repomix als Bibliothek zur Verarbeitung von Remote-Repositories. Sie können die Implementierung in [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts) sehen. 
