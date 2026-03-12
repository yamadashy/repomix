# Utilizzo Base

## Avvio Rapido

Impacchetta l'intero repository:

```bash
repomix
```

## Casi d'Uso Comuni

### Impacchettare Directory Specifiche

```bash
repomix path/to/directory
```

### Includere File Specifici

Usa i [pattern glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Escludere File

```bash
repomix --ignore "**/*.log,tmp/"
```

### Dividere l'Output in Più File

Quando si lavora con codebase di grandi dimensioni, l'output impacchettato potrebbe superare i limiti di dimensione dei file imposti da alcuni strumenti AI (ad esempio, il limite di 1MB di Google AI Studio). Usa `--split-output` per dividere automaticamente l'output in più file:

```bash
repomix --split-output 1mb
```

Questo genera file numerati come:
- `repomix-output.1.xml`
- `repomix-output.2.xml`
- `repomix-output.3.xml`

La dimensione può essere specificata con unità: `500kb`, `1mb`, `2mb`, `1.5mb`, ecc. Sono supportati valori decimali.

> [!NOTE]
> I file sono raggruppati per directory di primo livello per mantenere il contesto. Un singolo file o directory non verrà mai diviso tra più file di output.

### Repository Remoti

```bash
# Usando l'URL GitHub
repomix --remote https://github.com/user/repo
# Usando il formato abbreviato
repomix --remote user/repo
# Branch/tag/commit specifico
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### Input Lista File (stdin)

Passa i percorsi dei file tramite stdin per la massima flessibilità:

```bash
# Usando il comando find
find src -name "*.ts" -type f | repomix --stdin

# Usando git per ottenere i file tracciati
git ls-files "*.ts" | repomix --stdin

# Usando grep per trovare file contenenti contenuto specifico
grep -l "TODO" **/*.ts | repomix --stdin

# Usando ripgrep per trovare file con contenuto specifico
rg -l "TODO|FIXME" --type ts | repomix --stdin

# Usando ripgrep (rg) per trovare file
rg --files --type ts | repomix --stdin

# Usando sharkdp/fd per trovare file
fd -e ts | repomix --stdin

# Usando fzf per selezionare da tutti i file
fzf -m | repomix --stdin

# Selezione interattiva di file con fzf
find . -name "*.ts" -type f | fzf -m | repomix --stdin

# Usando ls con pattern glob
ls src/**/*.ts | repomix --stdin

# Da un file contenente percorsi di file
cat file-list.txt | repomix --stdin

# Input diretto con echo
echo -e "src/index.ts\nsrc/utils.ts" | repomix --stdin
```

L'opzione `--stdin` ti permette di passare una lista di percorsi di file a Repomix, offrendo la massima flessibilità nella selezione dei file da impacchettare.

Quando usi `--stdin`, i file specificati vengono effettivamente aggiunti ai pattern di inclusione. Questo significa che il normale comportamento di inclusione ed esclusione si applica comunque - i file specificati tramite stdin saranno comunque esclusi se corrispondono ai pattern di esclusione.

> [!NOTE]
> Quando usi `--stdin`, i percorsi dei file possono essere relativi o assoluti, e Repomix gestirà automaticamente la risoluzione dei percorsi e la deduplicazione.

### Compressione Codice

```bash
repomix --compress

# Puoi usarlo anche con repository remoti:
repomix --remote yamadashy/repomix --compress
```

### Integrazione Git

Includi informazioni Git per fornire contesto di sviluppo per l'analisi IA:

```bash
# Includi i diff git (modifiche non committate)
repomix --include-diffs

# Includi i log dei commit git (ultimi 50 commit per impostazione predefinita)
repomix --include-logs

# Includi un numero specifico di commit
repomix --include-logs --include-logs-count 10

# Includi sia diff che log
repomix --include-diffs --include-logs
```

Questo aggiunge contesto prezioso su:
- **Modifiche recenti**: I diff Git mostrano le modifiche non committate
- **Pattern di sviluppo**: I log Git rivelano quali file vengono tipicamente modificati insieme
- **Cronologia dei commit**: I messaggi dei commit recenti danno un'idea del focus di sviluppo
- **Relazioni tra file**: Comprendere quali file vengono modificati negli stessi commit

### Ottimizzazione del Conteggio Token

Capire la distribuzione dei token della tua codebase è cruciale per ottimizzare le interazioni IA. Usa l'opzione `--token-count-tree` per visualizzare l'utilizzo dei token nell'intero progetto:

```bash
repomix --token-count-tree
```

Questo mostra una vista gerarchica della tua codebase con i conteggi dei token:

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

Puoi anche impostare una soglia minima di token per concentrarti sui file più grandi:

```bash
repomix --token-count-tree 1000  # Mostra solo file/directory con 1000+ token
```

Questo ti aiuta a:
- **Identificare file pesanti di token** - che potrebbero superare i limiti di contesto IA
- **Ottimizzare la selezione dei file** - usando i pattern `--include` e `--ignore`
- **Pianificare strategie di compressione** - mirando ai maggiori contributori
- **Bilanciare contenuto vs contesto** - quando prepari il codice per l'analisi IA

## Formati di Output

### XML (Predefinito)

```bash
repomix --style xml
```

### Markdown

```bash
repomix --style markdown
```

### JSON

```bash
repomix --style json
```

### Testo Semplice

```bash
repomix --style plain
```

## Opzioni Aggiuntive

### Rimuovere Commenti

```bash
repomix --remove-comments
```

### Mostrare Numeri di Riga

```bash
repomix --output-show-line-numbers
```

### Copiare negli Appunti

```bash
repomix --copy
```

### Disabilitare Controllo di Sicurezza

```bash
repomix --no-security-check
```

## Configurazione

Inizializza il file di configurazione:

```bash
repomix --init
```

Consulta la [Guida alla Configurazione](/it/guide/configuration) per le opzioni dettagliate.
