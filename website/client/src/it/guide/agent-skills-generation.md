# Generazione Agent Skills

Repomix può generare output nel formato [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills), creando una directory strutturata di Skills che può essere usata come riferimento di codebase riutilizzabile per gli assistenti IA.

Questa funzionalità è particolarmente potente quando vuoi fare riferimento a implementazioni di repository remoti. Generando Skills da progetti open source, puoi facilmente chiedere a Claude di fare riferimento a pattern o implementazioni specifiche mentre lavori sul tuo codice.

Invece di generare un singolo file impacchettato, la generazione di Skills crea una directory strutturata con più file di riferimento ottimizzati per la comprensione dell'IA e la ricerca compatibile con grep.

> [!NOTE]
> Questa è una funzionalità sperimentale. Il formato di output e le opzioni potrebbero cambiare nelle versioni future in base ai feedback degli utenti.

## Utilizzo Base

Genera Skills dalla tua directory locale:

```bash
# Genera Skills dalla directory corrente
repomix --skill-generate

# Genera con un nome Skills personalizzato
repomix --skill-generate my-project-reference

# Genera da una directory specifica
repomix path/to/directory --skill-generate

# Genera da un repository remoto
repomix --remote https://github.com/user/repo --skill-generate
```

## Selezione della Posizione degli Skills

Quando esegui il comando, Repomix ti chiede di scegliere dove salvare gli Skills:

1. **Personal Skills** (`~/.claude/skills/`) - Disponibile per tutti i progetti sulla tua macchina
2. **Project Skills** (`.claude/skills/`) - Condiviso con il tuo team tramite git

Se la directory Skills esiste già, ti verrà chiesto di confermare la sovrascrittura.

> [!TIP]
> Quando generi Project Skills, considera di aggiungerli a `.gitignore` per evitare di committare file grandi:
> ```gitignore
> .claude/skills/repomix-reference-*/
> ```

## Struttura Generata

Gli Skills vengono generati con la seguente struttura:

```text
.claude/skills/<skill-name>/
├── SKILL.md                    # Metadati principali e documentazione Skills
└── references/
    ├── summary.md              # Scopo, formato e statistiche
    ├── project-structure.md    # Albero con conteggio righe
    ├── files.md                # Tutto il contenuto dei file (compatibile grep)
    └── tech-stack.md           # Linguaggi, framework, dipendenze
```

### Descrizioni dei File

#### SKILL.md

Il file principale degli Skills contiene:
- Nome Skills, descrizione e informazioni del progetto
- Conteggio file, righe e token
- Panoramica dell'utilizzo degli Skills
- Posizioni dei file e spiegazione del formato
- Casi d'uso comuni e suggerimenti

#### references/summary.md

Contiene:
- **Scopo**: Spiega che questa è una codebase di riferimento per uso IA
- **Struttura File**: Documenta il contenuto di ogni file di riferimento
- **Linee Guida d'Uso**: Come usare efficacemente gli Skills
- **Statistiche**: Ripartizione per tipo di file, linguaggio e file più grandi

#### references/project-structure.md

Albero con conteggio righe per file per una facile scoperta:

```text
src/
  index.ts (42 lines)
  utils/
    helpers.ts (128 lines)
    math.ts (87 lines)
```

#### references/files.md

Tutto il contenuto dei file con intestazioni di syntax highlighting, ottimizzato per la ricerca compatibile grep:

````markdown
## File: src/index.ts
```typescript
import { sum } from './utils/helpers';

export function main() {
  console.log(sum(1, 2));
}
```
````

#### references/tech-stack.md

Stack tecnologico auto-rilevato dai file delle dipendenze:
- **Linguaggi**: TypeScript, JavaScript, Python, ecc.
- **Framework**: React, Next.js, Express, Django, ecc.
- **Versioni Runtime**: Node.js, Python, Go, ecc.
- **Package Manager**: npm, pnpm, poetry, ecc.
- **Dipendenze**: Tutte le dipendenze dirette e di sviluppo
- **File di Configurazione**: Tutti i file di configurazione rilevati

Rilevato da file come: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.nvmrc`, `pyproject.toml`, ecc.

## Nomi Skills Auto-Generati

Se non viene fornito un nome, Repomix ne genera automaticamente uno con questo pattern:

```bash
repomix src/ --skill-generate                # → repomix-reference-src
repomix --remote user/repo --skill-generate  # → repomix-reference-repo
repomix --skill-generate CustomName          # → custom-name (normalizzato in kebab-case)
```

I nomi degli Skills sono:
- Convertiti in kebab-case (minuscole, separati da trattini)
- Limitati a massimo 64 caratteri
- Protetti contro path traversal

## Integrazione con le Opzioni Repomix

La generazione di Skills rispetta tutte le opzioni standard di Repomix:

```bash
# Genera Skills con filtraggio file
repomix --skill-generate --include "src/**/*.ts" --ignore "**/*.test.ts"

# Genera Skills con compressione
repomix --skill-generate --compress

# Genera Skills da un repository remoto
repomix --remote yamadashy/repomix --skill-generate

# Genera Skills con opzioni specifiche di formato output
repomix --skill-generate --remove-comments --remove-empty-lines
```

### Skills Solo Documentazione

Usando `--include`, puoi generare Skills contenenti solo la documentazione di un repository GitHub. È utile quando vuoi che Claude faccia riferimento a documentazione specifica di librerie o framework mentre lavori sul tuo codice:

```bash
# Documentazione Claude Code Action
repomix --remote https://github.com/anthropics/claude-code-action --include docs --skill-generate

# Documentazione Vite
repomix --remote https://github.com/vitejs/vite --include docs --skill-generate

# Documentazione React
repomix --remote https://github.com/reactjs/react.dev --include src/content --skill-generate
```

## Limitazioni

L'opzione `--skill-generate` non può essere usata con:
- `--stdout` - L'output Skills richiede scrittura sul file system
- `--copy` - L'output Skills è una directory, non copiabile negli appunti

## Uso degli Skills Generati

Una volta generati, puoi usare gli Skills con Claude:

1. **Claude Code**: Gli Skills sono automaticamente disponibili se salvati in `~/.claude/skills/` o `.claude/skills/`
2. **Claude Web**: Carica la directory Skills su Claude per l'analisi della codebase
3. **Condivisione Team**: Committa `.claude/skills/` nel tuo repository per l'accesso di tutto il team

## Workflow di Esempio

### Creare una Libreria di Riferimento Personale

```bash
# Clona e analizza un progetto open source interessante
repomix --remote facebook/react --skill-generate react-reference

# Gli Skills sono salvati in ~/.claude/skills/react-reference/
# Ora puoi fare riferimento alla codebase di React in qualsiasi conversazione Claude
```

### Documentazione del Progetto Team

```bash
# Nella directory del tuo progetto
cd my-project

# Genera Skills per il tuo team
repomix --skill-generate

# Scegli "Project Skills" quando richiesto
# Gli Skills sono salvati in .claude/skills/repomix-reference-my-project/

# Committa e condividi con il tuo team
git add .claude/skills/
git commit -m "Add codebase reference Skills"
```

## Risorse Correlate

- [Plugin Claude Code](/it/guide/claude-code-plugins) - Scopri di più sui plugin Repomix per Claude Code
- [Server MCP](/it/guide/mcp-server) - Metodo alternativo di integrazione
- [Compressione Codice](/it/guide/code-compress) - Ridurre il conteggio token con la compressione
- [Configurazione](/it/guide/configuration) - Personalizzare il comportamento di Repomix
