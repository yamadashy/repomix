# Opzioni da Linea di Comando

## Opzioni Base
- `-v, --version`: Mostra la versione dello strumento

## Opzioni di Input/Output CLI

| Opzione | Descrizione |
|---------|-------------|
| `--verbose` | Abilita il logging di debug dettagliato (mostra l'elaborazione dei file, i conteggi token e i dettagli di configurazione) |
| `--quiet` | Sopprime tutto l'output in console eccetto gli errori (utile per lo scripting) |
| `--stdout` | Scrive l'output impacchettato direttamente su stdout invece di un file (sopprime tutto il logging) |
| `--stdin` | Legge i percorsi dei file da stdin, uno per riga (i file specificati vengono elaborati direttamente) |
| `--copy` | Copia l'output generato negli appunti di sistema dopo l'elaborazione |
| `--token-count-tree [threshold]` | Mostra l'albero dei file con conteggi token; soglia opzionale per mostrare solo file con almeno N token (es: `--token-count-tree 100`) |
| `--top-files-len <number>` | Numero dei file più grandi da mostrare nel riepilogo (predefinito: `5`) |

## Opzioni di Output Repomix

| Opzione | Descrizione |
|---------|-------------|
| `-o, --output <file>` | Percorso del file di output (predefinito: `repomix-output.xml`, usa `"-"` per stdout) |
| `--style <style>` | Formato di output: `xml`, `markdown`, `json` o `plain` (predefinito: `xml`) |
| `--parsable-style` | Esegue l'escape dei caratteri speciali per garantire XML/Markdown valido (necessario quando l'output contiene codice che interrompe la formattazione) |
| `--compress` | Estrae la struttura essenziale del codice (classi, funzioni, interfacce) tramite il parsing Tree-sitter |
| `--output-show-line-numbers` | Prefissa ogni riga con il suo numero di riga nell'output |
| `--no-file-summary` | Omette la sezione di riepilogo file dall'output |
| `--no-directory-structure` | Omette la visualizzazione ad albero delle directory dall'output |
| `--no-files` | Genera solo metadati senza contenuto dei file (utile per l'analisi del repository) |
| `--remove-comments` | Rimuove tutti i commenti dal codice prima dell'impacchettamento |
| `--remove-empty-lines` | Rimuove le righe vuote da tutti i file |
| `--truncate-base64` | Tronca le lunghe stringhe di dati base64 per ridurre la dimensione dell'output |
| `--header-text <text>` | Testo personalizzato da includere all'inizio dell'output |
| `--instruction-file-path <path>` | Percorso a un file contenente istruzioni personalizzate da includere nell'output |
| `--split-output <size>` | Divide l'output in più file numerati (es: `repomix-output.1.xml`); dimensione come `500kb`, `2mb` o `1.5mb` |
| `--include-empty-directories` | Include le cartelle senza file nella struttura delle directory |
| `--include-full-directory-structure` | Mostra l'albero completo del repository nella sezione Struttura Directory, anche quando si usano pattern `--include` |
| `--no-git-sort-by-changes` | Non ordinare i file per frequenza di modifiche git (predefinito: file più modificati per primi) |
| `--include-diffs` | Aggiunge una sezione diff git che mostra le modifiche dell'albero di lavoro e le modifiche staged |
| `--include-logs` | Aggiunge la cronologia dei commit git con messaggi e file modificati |
| `--include-logs-count <count>` | Numero di commit recenti da includere con `--include-logs` (predefinito: `50`) |

## Opzioni di Selezione File

| Opzione | Descrizione |
|---------|-------------|
| `--include <patterns>` | Includi solo i file che corrispondono a questi pattern glob (separati da virgola, es: `"src/**/*.js,*.md"`) |
| `-i, --ignore <patterns>` | Pattern aggiuntivi da escludere (separati da virgola, es: `"*.test.js,docs/**"`) |
| `--no-gitignore` | Non usare le regole `.gitignore` per filtrare i file |
| `--no-dot-ignore` | Non usare le regole `.ignore` per filtrare i file |
| `--no-default-patterns` | Non applicare i pattern di esclusione integrati (`node_modules`, `.git`, directory di build, ecc.) |

## Opzioni Repository Remoto

| Opzione | Descrizione |
|---------|-------------|
| `--remote <url>` | Clona e impacchetta un repository remoto (URL GitHub o formato `user/repo`) |
| `--remote-branch <name>` | Branch, tag o commit specifico da usare (predefinito: branch predefinito del repository) |
| `--remote-trust-config` | Considera affidabili e carica i file di configurazione dai repository remoti (disabilitato per impostazione predefinita per sicurezza) |

## Opzioni di Configurazione

| Opzione | Descrizione |
|---------|-------------|
| `-c, --config <path>` | Usa un file di configurazione personalizzato al posto di `repomix.config.json` |
| `--init` | Crea un nuovo file `repomix.config.json` con i valori predefiniti |
| `--global` | Con `--init`, crea la configurazione nella directory home invece della directory corrente |

## Opzioni di Sicurezza
- `--no-security-check`: Salta la ricerca di dati sensibili come chiavi API e password

## Opzioni di Conteggio Token
- `--token-count-encoding <encoding>`: Modello di tokenizer per il conteggio: o200k_base (GPT-4o), cl100k_base (GPT-3.5/4), ecc. (predefinito: o200k_base)

## Opzioni MCP
- `--mcp`: Funziona come server Model Context Protocol per l'integrazione di strumenti IA

## Opzioni di Generazione Agent Skills

| Opzione | Descrizione |
|---------|-------------|
| `--skill-generate [name]` | Genera output in formato Claude Agent Skills nella directory `.claude/skills/<name>/` (nome auto-generato se omesso) |
| `--skill-output <path>` | Specifica direttamente il percorso della directory di output delle skill (salta il prompt di posizione) |
| `-f, --force` | Salta tutti i prompt di conferma (es: sovrascrittura della directory delle skill) |

## Risorse correlate

- [Configurazione](/it/guide/configuration) - Impostare le opzioni nel file di configurazione invece dei flag CLI
- [Formati di Output](/it/guide/output) - Dettagli su XML, Markdown, JSON e testo semplice
- [Compressione Codice](/it/guide/code-compress) - Come funziona `--compress` con Tree-sitter
- [Sicurezza](/it/guide/security) - Cosa disabilita `--no-security-check`

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

