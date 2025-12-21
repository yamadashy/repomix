# Opzioni da Linea di Comando

## Opzioni Base
- `-v, --version`: Mostra la versione dello strumento

## Opzioni di Input/Output CLI
- `--verbose`: Abilita il logging dettagliato
- `--quiet`: Disabilita qualsiasi output verso stdout
- `--stdout`: Output verso stdout invece di scrivere su file (non può essere usato con l'opzione `--output`)
- `--stdin`: Legge i percorsi dei file da stdin invece di scoprire automaticamente i file
- `--copy`: Copia anche l'output generato negli appunti di sistema
- `--token-count-tree [threshold]`: Mostra l'albero dei file con riepiloghi del conteggio token (opzionale: soglia minima conteggio token). Utile per identificare file grandi e ottimizzare l'utilizzo dei token per i limiti di contesto IA
- `--top-files-len <number>`: Numero dei file più grandi da mostrare nel riepilogo (predefinito: 5, es: --top-files-len 20)

## Opzioni di Output Repomix
- `-o, --output <file>`: Percorso del file di output (predefinito: repomix-output.xml, usa "-" per stdout)
- `--style <type>`: Formato di output: xml, markdown, json o plain (predefinito: xml)
- `--parsable-style`: Abilita output analizzabile basato sullo schema di stile scelto. Nota che questo può aumentare il conteggio token.
- `--compress`: Esegue estrazione intelligente del codice, concentrandosi sulle firme essenziali di funzioni e classi per ridurre il conteggio token
- `--output-show-line-numbers`: Mostra i numeri di riga nell'output
- `--no-file-summary`: Disabilita l'output della sezione riepilogo file
- `--no-directory-structure`: Disabilita l'output della sezione struttura directory
- `--no-files`: Disabilita l'output del contenuto dei file (modalità solo metadati)
- `--remove-comments`: Rimuove i commenti dai tipi di file supportati
- `--remove-empty-lines`: Rimuove le righe vuote dall'output
- `--truncate-base64`: Abilita il troncamento delle stringhe di dati base64
- `--header-text <text>`: Testo personalizzato da includere nell'intestazione del file
- `--instruction-file-path <path>`: Percorso a un file contenente istruzioni personalizzate dettagliate
- `--split-output <size>`: Dividi l'output in più file numerati (es.: repomix-output.1.xml, repomix-output.2.xml); con dimensioni come 500kb, 2mb o 1.5mb
- `--include-empty-directories`: Include le directory vuote nell'output
- `--include-full-directory-structure`: Mostra l'albero completo del repository nella sezione Struttura Directory, anche quando si usano pattern --include
- `--include-diffs`: Include i diff git nell'output (include le modifiche dell'albero di lavoro e le modifiche staged separatamente)
- `--include-logs`: Include i log git nell'output (include la cronologia dei commit con date, messaggi e percorsi file)
- `--include-logs-count <count>`: Numero di commit dei log git da includere (predefinito: 50)
- `--no-git-sort-by-changes`: Disabilita l'ordinamento dei file per numero di modifiche git (abilitato per impostazione predefinita)

## Opzioni di Selezione File
- `--include <patterns>`: Lista dei pattern di inclusione (separati da virgola)
- `-i, --ignore <patterns>`: Pattern di esclusione aggiuntivi (separati da virgola)
- `--no-gitignore`: Disabilita l'uso del file .gitignore
- `--no-dot-ignore`: Disabilita l'uso del file .ignore
- `--no-default-patterns`: Disabilita i pattern predefiniti

## Opzioni Repository Remoto
- `--remote <url>`: Elabora un repository remoto
- `--remote-branch <name>`: Specifica il nome del branch remoto, tag o hash del commit (predefinito al branch predefinito del repository)

## Opzioni di Configurazione
- `-c, --config <path>`: Percorso del file di configurazione personalizzato
- `--init`: Crea un file di configurazione
- `--global`: Usa la configurazione globale

## Opzioni di Sicurezza
- `--no-security-check`: Salta la ricerca di dati sensibili come chiavi API e password

## Opzioni di Conteggio Token
- `--token-count-encoding <encoding>`: Modello di tokenizer per il conteggio: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), ecc. (predefinito: o200k_base)

## Opzioni MCP
- `--mcp`: Funziona come server Model Context Protocol per l'integrazione di strumenti IA

## Esempi

```bash
# Utilizzo base
repomix

# File di output e formato personalizzati
repomix -o my-output.xml --style xml

# Output verso stdout
repomix --stdout > custom-output.txt

# Output verso stdout, poi reindirizzamento a un altro comando (es. simonw/llm)
repomix --stdout | llm "Per favore spiega cosa fa questo codice."

# Output personalizzato con compressione
repomix --compress

# Elabora file specifici con pattern
repomix --include "src/**/*.ts,*.md" --ignore "*.test.js,docs/**"

# Repository remoto con branch
repomix --remote https://github.com/user/repo/tree/main

# Repository remoto con commit
repomix --remote https://github.com/user/repo/commit/836abcd7335137228ad77feb28655d85712680f1

# Repository remoto con forma abbreviata
repomix --remote user/repo

# Lista file usando stdin
find src -name "*.ts" -type f | repomix --stdin
git ls-files "*.js" | repomix --stdin
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin

# Integrazione Git
repomix --include-diffs  # Include i diff git per le modifiche non committate
repomix --include-logs   # Include i log git (ultimi 50 commit per impostazione predefinita)
repomix --include-logs --include-logs-count 10  # Include gli ultimi 10 commit
repomix --include-diffs --include-logs  # Include sia diff che log

# Analisi del conteggio token
repomix --token-count-tree
repomix --token-count-tree 1000  # Mostra solo file/directory con 1000+ token
```

