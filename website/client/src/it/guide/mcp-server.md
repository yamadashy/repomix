# Server MCP

Repomix supporta il [Model Context Protocol (MCP)](https://modelcontextprotocol.io), permettendo agli assistenti IA di interagire direttamente con la tua codebase. Quando viene eseguito come server MCP, Repomix fornisce strumenti che permettono agli assistenti IA di impacchettare repository locali o remoti per l'analisi senza richiedere la preparazione manuale dei file.

> [!NOTE]
> Questa è una funzionalità sperimentale che miglioreremo attivamente in base ai feedback degli utenti e all'uso reale

## Eseguire Repomix come Server MCP

Per eseguire Repomix come server MCP, usa l'opzione `--mcp`:
```bash
repomix --mcp
```

Questo avvia Repomix in modalità server MCP, rendendolo disponibile per gli assistenti IA che supportano il Model Context Protocol.

## Configurazione dei Server MCP

Per usare Repomix come server MCP con assistenti IA come Claude, devi configurare le impostazioni MCP:

### Per VS Code

Puoi installare il server MCP Repomix in VS Code usando uno di questi metodi:

1. **Usando il badge di installazione:**

  [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Usando la linea di comando:**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  Per VS Code Insiders:
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Per Cline (estensione VS Code)

Modifica il file `cline_mcp_settings.json`:
```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Per Cursor

In Cursor, aggiungi un nuovo server MCP da `Cursor Settings` > `MCP` > `+ Add new global MCP server` con una configurazione simile a quella di Cline.

### Per Claude Desktop

Modifica il file `claude_desktop_config.json` con una configurazione simile a quella di Cline.

### Per Claude Code

Per configurare Repomix come server MCP in [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), usa il seguente comando:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

In alternativa, puoi usare i **plugin ufficiali Repomix** per un'esperienza più comoda. I plugin forniscono comandi in linguaggio naturale e una configurazione più semplice. Consulta la documentazione [Plugin Claude Code](/it/guide/claude-code-plugins) per i dettagli.

### Usare Docker invece di npx

Invece di usare npx, puoi usare Docker per eseguire Repomix come server MCP:

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## Strumenti MCP Disponibili

In modalità server MCP, Repomix fornisce i seguenti strumenti:

### pack_codebase

Questo strumento impacchetta una directory di codice locale in un file XML per l'analisi IA. Analizza la struttura della codebase, estrae il contenuto di codice rilevante e genera un report completo che include metriche, albero dei file e contenuto di codice formattato.

**Parametri:**

| Parametro | Richiesto | Predefinito | Descrizione |
|-----------|-----------|-------------|-------------|
| `directory` | Si | — | Percorso assoluto alla directory da impacchettare |
| `compress` | No | `false` | Abilita la compressione Tree-sitter per estrarre le firme di codice essenziali e la struttura rimuovendo i dettagli di implementazione. Riduce l'utilizzo dei token di circa il 70% preservando il significato semantico. Generalmente non necessario poiché `grep_repomix_output` permette il recupero incrementale del contenuto. |
| `includePatterns` | No | — | File da includere usando pattern fast-glob. Separati da virgole (es: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | No | — | File aggiuntivi da escludere usando pattern fast-glob. Separati da virgole (es: `"test/**,*.spec.js"`). Completano `.gitignore` e le esclusioni integrate. |
| `topFilesLength` | No | `10` | Numero dei file più grandi per dimensione da mostrare nel riepilogo delle metriche |
| `style` | No | `xml` | Stile del formato di output: `xml`, `markdown`, `json` o `plain` |

**Esempio:**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

Questo strumento recupera, clona e impacchetta un repository GitHub in un file XML per l'analisi IA. Clona automaticamente il repository remoto, analizza la sua struttura e genera un report completo.

**Parametri:**

| Parametro | Richiesto | Predefinito | Descrizione |
|-----------|-----------|-------------|-------------|
| `remote` | Si | — | URL del repository GitHub o formato `utente/repo` (es: `"yamadashy/repomix"`, `"https://github.com/user/repo"` o `"https://github.com/user/repo/tree/branch"`) |
| `compress` | No | `false` | Abilita la compressione Tree-sitter per estrarre le firme di codice essenziali e la struttura rimuovendo i dettagli di implementazione. Riduce l'utilizzo dei token di circa il 70% preservando il significato semantico. Generalmente non necessario poiché `grep_repomix_output` permette il recupero incrementale del contenuto. |
| `includePatterns` | No | — | File da includere usando pattern fast-glob. Separati da virgole (es: `"**/*.{js,ts}"`, `"src/**,docs/**"`) |
| `ignorePatterns` | No | — | File aggiuntivi da escludere usando pattern fast-glob. Separati da virgole (es: `"test/**,*.spec.js"`). Completano `.gitignore` e le esclusioni integrate. |
| `topFilesLength` | No | `10` | Numero dei file più grandi per dimensione da mostrare nel riepilogo delle metriche |
| `style` | No | `xml` | Stile del formato di output: `xml`, `markdown`, `json` o `plain` |

**Esempio:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### read_repomix_output

Questo strumento legge il contenuto di un file di output generato da Repomix. Supporta la lettura parziale con specifica dell'intervallo di righe per file grandi. Questo strumento è progettato per ambienti dove l'accesso diretto al file system è limitato.

**Parametri:**

| Parametro | Richiesto | Predefinito | Descrizione |
|-----------|-----------|-------------|-------------|
| `outputId` | Si | — | ID del file di output Repomix da leggere |
| `startLine` | No | Inizio del file | Numero di riga di inizio (basato su 1, incluso) |
| `endLine` | No | Fine del file | Numero di riga di fine (basato su 1, incluso) |

**Funzionalità:**
- Progettato specificamente per ambienti basati sul web o applicazioni sandbox
- Recupera il contenuto degli output generati precedentemente usando il loro ID
- Fornisce accesso sicuro alla codebase impacchettata senza richiedere accesso al file system
- Supporta la lettura parziale per file grandi

**Esempio:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

Questo strumento cerca pattern in un file di output Repomix usando funzionalità simili a grep con la sintassi JavaScript RegExp. Restituisce le righe corrispondenti con righe di contesto opzionali intorno alle corrispondenze.

**Parametri:**

| Parametro | Richiesto | Predefinito | Descrizione |
|-----------|-----------|-------------|-------------|
| `outputId` | Si | — | ID del file di output Repomix da cercare |
| `pattern` | Si | — | Pattern di ricerca (sintassi JavaScript RegExp) |
| `contextLines` | No | `0` | Numero di righe di contesto prima e dopo ogni corrispondenza. Sovrascritto da `beforeLines`/`afterLines` se specificato. |
| `beforeLines` | No | — | Righe da mostrare prima di ogni corrispondenza (come `grep -B`). Ha priorità su `contextLines`. |
| `afterLines` | No | — | Righe da mostrare dopo ogni corrispondenza (come `grep -A`). Ha priorità su `contextLines`. |
| `ignoreCase` | No | `false` | Esegue una corrispondenza case-insensitive |

**Funzionalità:**
- Usa la sintassi JavaScript RegExp per una potente corrispondenza di pattern
- Supporta righe di contesto per una migliore comprensione delle corrispondenze
- Permette controllo separato delle righe di contesto prima/dopo
- Opzioni di ricerca case-sensitive e case-insensitive

**Esempio:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file e file_system_read_directory

Il server MCP di Repomix fornisce due strumenti per il file system che permettono agli assistenti IA di interagire in sicurezza con il file system locale:

1. `file_system_read_file`
  - Legge il contenuto dei file dal file system locale usando percorsi assoluti
  - Include validazione di sicurezza integrata per rilevare e prevenire l'accesso a file contenenti informazioni sensibili
  - Implementa la validazione di sicurezza con [Secretlint](https://github.com/secretlint/secretlint)
  - Impedisce l'accesso a file contenenti informazioni sensibili (chiavi API, password, segreti)
  - Valida i percorsi assoluti per prevenire attacchi di directory traversal
  - Restituisce messaggi di errore chiari per percorsi invalidi e problemi di sicurezza

2. `file_system_read_directory`
  - Elenca il contenuto di una directory usando un percorso assoluto
  - Restituisce una lista formattata che mostra file e sottodirectory con indicatori chiari
  - Mostra file e directory con indicatori chiari (`[FILE]` o `[DIR]`)
  - Fornisce attraversamento sicuro delle directory con gestione appropriata degli errori
  - Valida i percorsi e si assicura che siano assoluti
  - Utile per esplorare la struttura del progetto e comprendere l'organizzazione della codebase

Entrambi gli strumenti integrano robuste misure di sicurezza:
- Validazione dei percorsi assoluti per prevenire attacchi di directory traversal
- Controlli dei permessi per assicurare diritti di accesso appropriati
- Integrazione con Secretlint per il rilevamento di informazioni sensibili
- Messaggi di errore chiari per un migliore debug e consapevolezza della sicurezza

**Esempio:**
```typescript
// Lettura di un file
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Elenco del contenuto di una directory
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

Questi strumenti sono particolarmente utili quando gli assistenti IA devono:
- Analizzare file specifici nella codebase
- Navigare nelle strutture delle directory
- Verificare l'esistenza e l'accessibilità dei file
- Assicurare operazioni sicure sul file system

## Vantaggi dell'Uso di Repomix come Server MCP

L'uso di Repomix come server MCP offre diversi vantaggi:

1. **Integrazione diretta**: Gli assistenti IA possono analizzare direttamente la tua codebase senza preparazione manuale dei file.
2. **Workflow efficiente**: Semplifica il processo di analisi del codice eliminando la necessità di generare e caricare manualmente i file.
3. **Output coerente**: Garantisce che l'assistente IA riceva la codebase in un formato coerente e ottimizzato.
4. **Funzionalità avanzate**: Sfrutta tutte le funzionalità di Repomix come la compressione del codice, il conteggio dei token e i controlli di sicurezza.

Una volta configurato, il tuo assistente IA può usare direttamente le capacità di Repomix per analizzare le codebase, rendendo i workflow di analisi del codice più efficienti.

## Risorse correlate

- [Plugin Claude Code](/it/guide/claude-code-plugins) - Integrazione pratica dei plugin per Claude Code
- [Configurazione](/it/guide/configuration) - Personalizzare il comportamento di Repomix
- [Opzioni da Linea di Comando](/it/guide/command-line-options) - Riferimento completo della CLI
- [Formati di Output](/it/guide/output) - Scoprire i formati di output disponibili
