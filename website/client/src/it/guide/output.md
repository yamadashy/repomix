# Formati di Output

Repomix supporta quattro formati di output:
- XML (predefinito)
- Markdown
- JSON
- Testo semplice

## Formato XML

```bash
repomix --style xml
```

Il formato XML è ottimizzato per l'elaborazione da parte dell'IA:

```xml
Questo file è una rappresentazione unificata dell'intera codebase...
<file_summary>
(Metadati e istruzioni per l'IA)
</file_summary>
<directory_structure>
src/
  index.ts
  utils/
    helper.ts
</directory_structure>
<files>
<file path="src/index.ts">
// Contenuto del file qui
</file>
</files>

<git_logs>
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
</git_logs>
```

### Perché XML come formato predefinito?

Repomix usa XML come formato di output predefinito basandosi su ricerche e test approfonditi. Questa decisione si fonda su prove empiriche e considerazioni pratiche per l'analisi del codice assistita dall'IA.

La nostra scelta di XML è principalmente influenzata dalle raccomandazioni ufficiali dei principali fornitori di IA:
- **Anthropic (Claude)**: Raccomanda esplicitamente l'uso di tag XML per strutturare i prompt, affermando che "Claude è stato esposto a tali prompt durante l'addestramento" ([documentazione](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags))
- **Google (Gemini)**: Raccomanda formati strutturati incluso XML per compiti complessi ([documentazione](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/structure-prompts))
- **OpenAI (GPT)**: Sostiene il prompting strutturato in scenari complessi ([annuncio](https://x.com/OpenAIDevs/status/1890147300493914437), [cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide))

## Formato Markdown

```bash
repomix --style markdown
```

Il Markdown offre una formattazione leggibile:

````markdown
Questo file è una rappresentazione unificata dell'intera codebase...
# Riepilogo File
(Metadati e istruzioni per l'IA)
# Struttura Directory
```
src/
index.ts
utils/
helper.ts
```
# File
## File: src/index.ts
```typescript
// Contenuto del file qui
```

# Log Git
```
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```
````

## Formato JSON

```bash
repomix --style json
```

Il formato JSON fornisce un output strutturato e accessibile programmaticamente con nomi di proprietà in camelCase:

```json
{
  "fileSummary": {
    "generationHeader": "Questo file è una rappresentazione unificata dell'intera codebase, combinata in un singolo documento da Repomix.",
    "purpose": "Questo file contiene una rappresentazione compatta del contenuto dell'intero repository...",
    "fileFormat": "Il contenuto è organizzato come segue...",
    "usageGuidelines": "- Questo file dovrebbe essere trattato come di sola lettura...",
    "notes": "- Alcuni file potrebbero essere stati esclusi secondo le regole .gitignore..."
  },
  "userProvidedHeader": "Testo di intestazione personalizzato se specificato",
  "directoryStructure": "src/
  cli/
    cliOutput.ts
    index.ts
  config/
    configLoader.ts",
  "files": {
    "src/index.js": "// Contenuto del file qui",
    "src/utils.js": "// Contenuto del file qui"
  },
  "instruction": "Istruzioni personalizzate da instructionFilePath"
}
```

### Vantaggi del Formato JSON

Il formato JSON è ideale per:
- **Elaborazione programmatica**: Facile da analizzare e manipolare con librerie JSON in qualsiasi linguaggio di programmazione
- **Integrazione API**: Consumo diretto da servizi web e applicazioni
- **Compatibilità strumenti IA**: Formato strutturato ottimizzato per machine learning e sistemi IA
- **Analisi dati**: Estrazione semplice di informazioni specifiche con strumenti come `jq`

### Lavorare con l'Output JSON usando `jq`

Il formato JSON facilita l'estrazione programmatica di informazioni specifiche. Ecco esempi comuni:

#### Operazioni Base sui File
```bash
# Elenca tutti i percorsi dei file
cat repomix-output.json | jq -r '.files | keys[]'

# Conta il numero totale di file
cat repomix-output.json | jq '.files | keys | length'

# Estrai il contenuto di un file specifico
cat repomix-output.json | jq -r '.files["README.md"]'
cat repomix-output.json | jq -r '.files["src/index.js"]'
```

#### Filtraggio e Analisi File
```bash
# Trova file per estensione
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".ts"))'
cat repomix-output.json | jq -r '.files | keys[] | select(endswith(".js") or endswith(".ts"))'

# Ottieni file contenenti testo specifico
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | contains("function")) | .key'

# Crea una lista di file con conteggio caratteri
cat repomix-output.json | jq -r '.files | to_entries[] | "\(.key): \(.value | length) caratteri"'
```

#### Estrazione Metadati
```bash
# Estrai la struttura delle directory
cat repomix-output.json | jq -r '.directoryStructure'

# Ottieni le informazioni del riepilogo file
cat repomix-output.json | jq '.fileSummary.purpose'
cat repomix-output.json | jq -r '.fileSummary.generationHeader'

# Estrai l'intestazione fornita dall'utente (se esiste)
cat repomix-output.json | jq -r '.userProvidedHeader // "Nessuna intestazione fornita"'

# Ottieni le istruzioni personalizzate
cat repomix-output.json | jq -r '.instruction // "Nessuna istruzione fornita"'
```

#### Analisi Avanzata
```bash
# Trova i file più grandi per lunghezza del contenuto
cat repomix-output.json | jq -r '.files | to_entries[] | [.key, (.value | length)] | @tsv' | sort -k2 -nr | head -10

# Cerca file contenenti pattern specifici
cat repomix-output.json | jq -r '.files | to_entries[] | select(.value | test("import.*react"; "i")) | .key'

# Estrai percorsi di file corrispondenti a multiple estensioni
cat repomix-output.json | jq -r '.files | keys[] | select(test("\.(js|ts|jsx|tsx)$"))'
```

## Formato Testo Semplice

```bash
repomix --style plain
```

Struttura di output:

```text
Questo file è una rappresentazione unificata dell'intera codebase...
================
Riepilogo File
================
(Metadati e istruzioni per l'IA)
================
Struttura Directory
================
src/
  index.ts
  utils/
    helper.ts
================
File
================
================
File: src/index.ts
================
// Contenuto del file qui

================
Log Git
================
2025-08-20 00:47:19 +0900|feat(cli): Add --include-logs option for git commit history
README.md
src/cli/cliRun.ts
src/core/git/gitCommand.ts
src/core/git/gitLogHandle.ts
src/core/output/outputGenerate.ts

2025-08-21 00:09:43 +0900|Merge pull request #795 from yamadashy/chore/ratchet-update-ci
.github/workflows/ratchet-update.yml
```

## Utilizzo con i Modelli IA

Ogni formato funziona bene con i modelli IA, ma considera:
- Usa XML per Claude (migliore precisione nell'analisi)
- Usa Markdown per una migliore leggibilità generale
- Usa JSON per l'elaborazione programmatica e l'integrazione API
- Usa testo semplice per semplicità e compatibilità universale

## Personalizzazione

Imposta il formato predefinito in `repomix.config.json`:

```json
{
  "output": {
    "style": "xml",
    "filePath": "output.xml"
  }
}
```
