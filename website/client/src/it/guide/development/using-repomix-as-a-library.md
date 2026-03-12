# Usare Repomix come Libreria

Oltre a usare Repomix come strumento CLI, puoi integrare le sue funzionalità direttamente nelle tue applicazioni Node.js.

## Installazione

Installa Repomix come dipendenza nel tuo progetto:

```bash
npm install repomix
```

## Utilizzo Base

Il modo più semplice per usare Repomix è tramite la funzione `runCli`, che fornisce le stesse funzionalità dell'interfaccia a linea di comando:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Elabora la directory corrente con opzioni personalizzate
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

Il `result.packResult` contiene informazioni sui file elaborati, inclusi:
- `totalFiles`: Numero di file elaborati
- `totalCharacters`: Numero totale di caratteri
- `totalTokens`: Numero totale di token (utile per i limiti di contesto degli LLM)
- `fileCharCounts`: Conteggio caratteri per file
- `fileTokenCounts`: Conteggio token per file

## Elaborazione di Repository Remoti

Puoi clonare ed elaborare un repository remoto:

```javascript
import { runCli, type CliOptions } from 'repomix';

// Clona ed elabora un repository GitHub
async function processRemoteRepo(repoUrl) {
  const options = {
    remote: repoUrl,
    output: 'output.xml',
    compress: true
  } as CliOptions;

  return await runCli(['.'], process.cwd(), options);
}
```

## Uso dei Componenti Core

Per un controllo più preciso, puoi usare direttamente le API di basso livello di Repomix:

```javascript
import { searchFiles, collectFiles, processFiles, TokenCounter } from 'repomix';

async function analyzeFiles(directory) {
  // Cerca e raccogli i file
  const { filePaths } = await searchFiles(directory, { /* configurazione */ });
  const rawFiles = await collectFiles(filePaths, directory);
  const processedFiles = await processFiles(rawFiles, { /* configurazione */ });

  // Conta i token
  const tokenCounter = new TokenCounter('o200k_base');

  // Restituisci i risultati dell'analisi
  return processedFiles.map(file => ({
    path: file.path,
    tokens: tokenCounter.countTokens(file.content)
  }));
}
```

## Bundling

Quando si effettua il bundling di repomix con strumenti come Rolldown o esbuild, alcune dipendenze devono rimanere esterne e i file WASM devono essere copiati:

**Dipendenze esterne (non possono essere bundled):**
- `tinypool` - Avvia thread worker utilizzando percorsi di file
- `tiktoken` - Carica file WASM dinamicamente a runtime

**File WASM da copiare:**
- `web-tree-sitter.wasm` → Stessa directory del JS bundled (richiesto per la funzionalità di compressione del codice)
- File di linguaggio Tree-sitter → Directory specificata dalla variabile d'ambiente `REPOMIX_WASM_DIR`

Per un esempio funzionante, consulta [website/server/scripts/bundle.mjs](https://github.com/yamadashy/repomix/blob/main/website/server/scripts/bundle.mjs).

## Esempio Reale

Il sito web di Repomix ([repomix.com](https://repomix.com)) usa Repomix come libreria per elaborare repository remoti. Puoi consultare l'implementazione in [website/server/src/remoteRepo.ts](https://github.com/yamadashy/repomix/blob/main/website/server/src/remoteRepo.ts).
