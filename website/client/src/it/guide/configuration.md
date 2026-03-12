# Configurazione

Repomix può essere configurato usando un file di configurazione o opzioni da linea di comando. Il file di configurazione ti permette di personalizzare vari aspetti dell'elaborazione e dell'output della tua codebase.

## Formati dei File di Configurazione

Repomix supporta diversi formati di file di configurazione per maggiore flessibilità e facilità d'uso.

Repomix cercherà automaticamente i file di configurazione nel seguente ordine di priorità:

1. **TypeScript** (`repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`)
2. **JavaScript/ES Module** (`repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`)
3. **JSON** (`repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`)

### Configurazione JSON

Crea un file di configurazione nella directory del tuo progetto:
```bash
repomix --init
```

Questo creerà un file `repomix.config.json` con le impostazioni predefinite. Puoi anche creare un file di configurazione globale che verrà usato come fallback quando non viene trovata una configurazione locale:

```bash
repomix --init --global
```

### Configurazione TypeScript

I file di configurazione TypeScript offrono la migliore esperienza di sviluppo con verifica completa dei tipi e supporto IDE.

**Installazione:**

Per usare la configurazione TypeScript o JavaScript con `defineConfig`, devi installare Repomix come dipendenza di sviluppo:

```bash
npm install -D repomix
```

**Esempio:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    filePath: 'output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
```

**Vantaggi:**
- ✅ Verifica completa dei tipi TypeScript nel tuo IDE
- ✅ Eccellente autocompletamento e IntelliSense
- ✅ Utilizzo di valori dinamici (timestamp, variabili d'ambiente, ecc.)

**Esempio di Valori Dinamici:**

```typescript
// repomix.config.ts
import { defineConfig } from 'repomix';

// Genera un nome file basato sul timestamp
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
});
```

### Configurazione JavaScript

I file di configurazione JavaScript funzionano allo stesso modo di TypeScript, supportando `defineConfig` e valori dinamici.

## Opzioni di Configurazione

| Opzione                           | Descrizione                                                                                                                  | Predefinito                |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------|------------------------|
| `input.maxFileSize`              | Dimensione massima dei file da elaborare in byte. I file più grandi saranno ignorati. Utile per escludere file binari grandi o file di dati | `50000000`            |
| `output.filePath`                | Nome del file di output. Supporta formati XML, Markdown e testo semplice                                            | `"repomix-output.xml"` |
| `output.style`                   | Stile di output (`xml`, `markdown`, `json`, `plain`). Ogni formato ha i suoi vantaggi per diversi strumenti IA              | `"xml"`                |
| `output.parsableStyle`           | Se effettuare l'escape dell'output secondo lo schema di stile scelto. Permette una migliore analisi ma può aumentare il conteggio token | `false`                |
| `output.compress`                | Se eseguire l'estrazione intelligente del codice usando Tree-sitter per ridurre il conteggio token preservando la struttura | `false`                |
| `output.headerText`              | Testo personalizzato da includere nell'intestazione del file. Utile per fornire contesto o istruzioni agli strumenti IA   | `null`                 |
| `output.instructionFilePath`     | Percorso a un file contenente istruzioni personalizzate dettagliate per l'elaborazione IA                      | `null`                 |
| `output.fileSummary`             | Se includere una sezione riepilogo all'inizio mostrando il conteggio file, dimensioni e altre metriche  | `true`                 |
| `output.directoryStructure`      | Se includere la struttura delle directory nell'output. Aiuta l'IA a capire l'organizzazione del progetto      | `true`                 |
| `output.files`                   | Se includere il contenuto dei file nell'output. Impostare a false per includere solo struttura e metadati | `true`                 |
| `output.removeComments`          | Se rimuovere i commenti dai tipi di file supportati. Può ridurre il rumore e il conteggio token | `false`                |
| `output.removeEmptyLines`        | Se rimuovere le righe vuote dall'output per ridurre il conteggio token                                   | `false`                |
| `output.showLineNumbers`         | Se aggiungere numeri di riga a ogni riga. Utile per riferirsi a parti specifiche del codice        | `false`                |
| `output.truncateBase64`          | Se troncare le stringhe di dati base64 lunghe (es. immagini) per ridurre il conteggio token | `false`                |
| `output.copyToClipboard`         | Se copiare l'output negli appunti di sistema oltre a salvare il file                         | `false`                |
| `output.splitOutput`             | Dividi l'output in più file numerati per dimensione massima per parte (es., `1000000` per ~1MB). CLI accetta dimensioni leggibili come `500kb` o `2mb`. Mantiene ogni file sotto il limite ed evita di dividere i file di origine tra le parti | Non impostato |
| `output.topFilesLength`          | Numero dei file principali da mostrare nel riepilogo. Se impostato a 0, nessun riepilogo sarà mostrato                        | `5`                    |
| `output.includeEmptyDirectories` | Se includere le directory vuote nella struttura del repository                                                   | `false`                |
| `output.includeFullDirectoryStructure` | Quando si usano pattern `include`, se mostrare l'albero completo delle directory (rispettando i pattern ignore) mentre si elaborano solo i file inclusi. Fornisce contesto completo del repository per l'analisi IA | `false`                |
| `output.git.sortByChanges`       | Se ordinare i file per numero di modifiche git. I file con più modifiche appaiono in fondo | `true`                 |
| `output.git.sortByChangesMaxCommits` | Numero massimo di commit da analizzare per le modifiche git. Limita la profondità della cronologia per le prestazioni | `100`                  |
| `output.git.includeDiffs`        | Se includere i diff git nell'output. Mostra separatamente le modifiche dell'albero di lavoro e le modifiche staged | `false`                |
| `output.git.includeLogs`         | Se includere i log git nell'output. Mostra la cronologia dei commit con date, messaggi e percorsi file | `false`                |
| `output.git.includeLogsCount`    | Numero di commit git recenti da includere nell'output                                                                          | `50`                   |
| `include`                        | Pattern dei file da includere usando [pattern glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `ignore.useGitignore`            | Se usare i pattern dal file `.gitignore` del progetto                                                      | `true`                 |
| `ignore.useDotIgnore`            | Se usare i pattern dal file `.ignore` del progetto                                                         | `true`                 |
| `ignore.useDefaultPatterns`      | Se usare i pattern di ignore predefiniti (node_modules, .git, ecc.)                                    | `true`                 |
| `ignore.customPatterns`          | Pattern aggiuntivi da ignorare usando [pattern glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax) | `[]`                   |
| `security.enableSecurityCheck`   | Se eseguire controlli di sicurezza usando Secretlint per rilevare informazioni sensibili   | `true`                 |
| `tokenCount.encoding`            | Encoding del conteggio token usato dal tokenizer [tiktoken](https://github.com/openai/tiktoken) di OpenAI. Usa `o200k_base` per GPT-4o, `cl100k_base` per GPT-4/3.5. Vedi [tiktoken model.py](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py#L24) per dettagli. | `"o200k_base"`         |

Il file di configurazione supporta la sintassi [JSON5](https://json5.org/), che permette:
- Commenti (sia su singola riga che su più righe)
- Virgole finali in oggetti e array
- Nomi di proprietà non tra virgolette
- Sintassi stringa più flessibile

## Validazione Schema

Puoi abilitare la validazione schema per il tuo file di configurazione aggiungendo la proprietà `$schema`:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown"
  }
}
```

Questo fornisce autocompletamento e validazione negli editor che supportano gli schema JSON.

## Esempio di File di Configurazione

Ecco un esempio completo di file di configurazione (`repomix.config.json`):

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 50000000
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "compress": false,
    "headerText": "Informazioni di intestazione personalizzate per il file compresso.",
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "includeEmptyDirectories": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": ["**/*"],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    // I pattern possono essere specificati anche in .repomixignore
    "customPatterns": [
      "additional-folder",
      "**/*.log"
    ],
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
```

## Posizioni dei File di Configurazione

Repomix cerca i file di configurazione nel seguente ordine:
1. File di configurazione locale nella directory corrente (ordine di priorità: TS > JS > JSON)
   - TypeScript: `repomix.config.ts`, `repomix.config.mts`, `repomix.config.cts`
   - JavaScript: `repomix.config.js`, `repomix.config.mjs`, `repomix.config.cjs`
   - JSON: `repomix.config.json5`, `repomix.config.jsonc`, `repomix.config.json`
2. File di configurazione globale (ordine di priorità: TS > JS > JSON)
   - Windows:
     - TypeScript: `%LOCALAPPDATA%\Repomix\repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `%LOCALAPPDATA%\Repomix\repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `%LOCALAPPDATA%\Repomix\repomix.config.json5`, `.jsonc`, `.json`
   - macOS/Linux:
     - TypeScript: `~/.config/repomix/repomix.config.ts`, `.mts`, `.cts`
     - JavaScript: `~/.config/repomix/repomix.config.js`, `.mjs`, `.cjs`
     - JSON: `~/.config/repomix/repomix.config.json5`, `.jsonc`, `.json`

Le opzioni da linea di comando hanno la priorità sulle impostazioni del file di configurazione.

## Pattern di Inclusione

Repomix supporta la specifica dei file da includere usando [pattern glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax). Questo permette una selezione di file più flessibile e potente:

- Usa `**/*.js` per includere tutti i file JavaScript in qualsiasi directory
- Usa `src/**/*` per includere tutti i file nella directory `src` e le sue sottodirectory
- Combina più pattern come `["src/**/*.js", "**/*.md"]` per includere i file JavaScript in `src` e tutti i file Markdown

Puoi specificare pattern di inclusione nel tuo file di configurazione:

```json
{
  "include": ["src/**/*", "tests/**/*.test.js"]
}
```

Oppure usa l'opzione da linea di comando `--include` per filtraggio una tantum.

## Pattern di Esclusione

Repomix offre diversi metodi per definire pattern di esclusione per escludere file o directory specifici durante il processo di impacchettamento:

- **.gitignore**: Per impostazione predefinita, i pattern elencati nei file `.gitignore` del progetto e `.git/info/exclude` sono usati. Questo comportamento può essere controllato con l'impostazione `ignore.useGitignore` o l'opzione CLI `--no-gitignore`.
- **.ignore**: Puoi usare un file `.ignore` alla radice del progetto, seguendo lo stesso formato di `.gitignore`. Questo file è rispettato da strumenti come ripgrep e the silver searcher, riducendo la necessità di mantenere più file di esclusione. Questo comportamento può essere controllato con l'impostazione `ignore.useDotIgnore` o l'opzione CLI `--no-dot-ignore`.
- **Pattern predefiniti**: Repomix include una lista predefinita di file e directory comunemente esclusi (es. node_modules, .git, file binari). Questa funzionalità può essere controllata con l'impostazione `ignore.useDefaultPatterns` o l'opzione CLI `--no-default-patterns`. Consulta [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts) per dettagli.
- **.repomixignore**: Puoi creare un file `.repomixignore` alla radice del progetto per definire pattern di esclusione specifici per Repomix. Questo file segue lo stesso formato di `.gitignore`.
- **Pattern personalizzati**: Pattern di esclusione aggiuntivi possono essere specificati usando l'opzione `ignore.customPatterns` nel file di configurazione. Puoi sovrascrivere questa impostazione con l'opzione da linea di comando `-i, --ignore`.

**Ordine di priorità** (dal più alto al più basso):

1. Pattern personalizzati (`ignore.customPatterns`)
2. File di esclusione (`.repomixignore`, `.ignore`, `.gitignore`, e `.git/info/exclude`):
   - Quando sono in directory annidate, i file nelle directory più profonde hanno priorità maggiore
   - Quando sono nella stessa directory, questi file sono uniti senza ordine particolare
3. Pattern predefiniti (se `ignore.useDefaultPatterns` è true e `--no-default-patterns` non è usato)

Questo approccio permette una configurazione flessibile dell'esclusione dei file in base alle esigenze del progetto. Aiuta a ottimizzare la dimensione del file impacchettato generato garantendo l'esclusione di file sensibili alla sicurezza e grandi file binari, mentre previene la fuga di informazioni confidenziali.

**Nota:** I file binari non sono inclusi nell'output impacchettato per impostazione predefinita, ma i loro percorsi sono elencati nella sezione "Struttura del Repository" del file di output. Questo fornisce una panoramica completa della struttura del repository mantenendo il file impacchettato efficiente e basato su testo. Vedi [Gestione File Binari](#gestione-file-binari) per dettagli.

Esempio di `.repomixignore`:
```text
# Directory di cache
.cache/
tmp/

# Output di build
dist/
build/

# Log
*.log
```

## Pattern di Esclusione Predefiniti

Quando `ignore.useDefaultPatterns` è true, Repomix ignora automaticamente i pattern comuni:
```text
node_modules/**
.git/**
coverage/**
dist/**
```

Per la lista completa, vedi [defaultIgnore.ts](https://github.com/yamadashy/repomix/blob/main/src/config/defaultIgnore.ts)

## Gestione File Binari

I file binari (come immagini, PDF, binari compilati, archivi, ecc.) sono trattati in modo speciale per mantenere un output efficiente basato su testo:

- **Contenuti dei file**: I file binari **non sono inclusi** nell'output impacchettato per mantenere il file basato su testo ed efficiente per l'elaborazione IA
- **Struttura delle directory**: I percorsi dei file binari **sono elencati** nella sezione struttura directory, fornendo una panoramica completa del repository

Questo approccio garantisce che ottieni una vista completa della struttura del repository mantenendo un output efficiente basato su testo ottimizzato per il consumo dell'IA.

**Esempio:**

Se il tuo repository contiene `logo.png` e `app.jar`:
- Appariranno nella sezione Struttura Directory
- I loro contenuti non saranno inclusi nella sezione File

**Output struttura directory:**
```
src/
  index.ts
  utils.ts
assets/
  logo.png
build/
  app.jar
```

In questo modo, gli strumenti IA possono capire che questi file binari esistono nella struttura del progetto senza elaborare i loro contenuti binari.

**Nota:** Puoi controllare la soglia massima della dimensione dei file usando l'opzione di configurazione `input.maxFileSize` (predefinito: 50MB). I file più grandi di questo limite saranno completamente ignorati.

## Funzionalità Avanzate

### Compressione del Codice

La funzionalità di compressione del codice, abilitata con `output.compress: true`, usa [Tree-sitter](https://github.com/tree-sitter/tree-sitter) per estrarre intelligentemente le strutture di codice essenziali mentre rimuove i dettagli di implementazione. Questo aiuta a ridurre il conteggio token mantenendo le informazioni strutturali importanti.

Vantaggi principali:
- Riduce significativamente il conteggio token
- Preserva le firme di classi e funzioni
- Mantiene import ed export
- Conserva le definizioni di tipi e le interfacce
- Rimuove i corpi delle funzioni e i dettagli di implementazione

Per dettagli ed esempi, consulta la [Guida alla Compressione del Codice](code-compress).

### Integrazione Git

La configurazione `output.git` fornisce potenti funzionalità relative a Git:

- `sortByChanges`: Quando true, i file sono ordinati per numero di modifiche Git (commit che hanno modificato il file). I file con più modifiche appaiono in fondo all'output. Questo aiuta a dare priorità ai file più attivamente sviluppati. Predefinito: `true`
- `sortByChangesMaxCommits`: Il numero massimo di commit da analizzare quando si contano le modifiche ai file. Predefinito: `100`
- `includeDiffs`: Quando true, include i diff Git nell'output (include separatamente le modifiche dell'albero di lavoro e le modifiche staged). Questo permette al lettore di vedere le modifiche in sospeso nel repository. Predefinito: `false`
- `includeLogs`: Quando true, include la cronologia dei commit Git nell'output. Mostra le date dei commit, i messaggi e i percorsi dei file per ogni commit. Questo aiuta l'IA a comprendere i pattern di sviluppo e le relazioni tra file. Predefinito: `false`
- `includeLogsCount`: Il numero di commit recenti da includere nei log git. Predefinito: `50`

Esempio di configurazione:
```json
{
  "output": {
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": true,
      "includeLogs": true,
      "includeLogsCount": 25
    }
  }
}
```

### Controlli di Sicurezza

Quando `security.enableSecurityCheck` è abilitato, Repomix usa [Secretlint](https://github.com/secretlint/secretlint) per rilevare informazioni sensibili nella tua codebase prima di includerle nell'output. Questo aiuta a prevenire l'esposizione accidentale di:

- Chiavi API
- Token di accesso
- Chiavi private
- Password
- Altre credenziali sensibili

### Rimozione Commenti

Quando `output.removeComments` è impostato a `true`, i commenti sono rimossi dai tipi di file supportati per ridurre la dimensione dell'output e concentrarsi sul contenuto essenziale del codice. Questo può essere particolarmente utile quando:

- Lavori con codice fortemente documentato
- Cerchi di ridurre il conteggio token
- Ti concentri sulla struttura e la logica del codice

Per i linguaggi supportati e esempi dettagliati, consulta la [Guida alla Rimozione Commenti](comment-removal).
