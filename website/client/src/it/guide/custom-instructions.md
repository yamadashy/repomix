# Istruzioni Personalizzate

Repomix ti permette di fornire istruzioni personalizzate che saranno incluse nel file di output. Questo può essere utile per aggiungere contesto o direttive specifiche per i sistemi IA che elaborano il repository.

## Utilizzo

Per includere un'istruzione personalizzata, crea un file markdown (es. `repomix-instruction.md`) alla radice del tuo repository. Poi, specifica il percorso di questo file nel tuo `repomix.config.json`:

```json
{
  "output": {
    "instructionFilePath": "repomix-instruction.md"
  }
}
```

Il contenuto di questo file sarà incluso nell'output sotto la sezione "Instruction".

## Esempio

```markdown
# Istruzioni del Repository
Questo repository contiene il codice sorgente dello strumento Repomix. Per favore segui queste direttive durante l'analisi del codice:
1. Concentrati sulle funzionalità principali nella directory `src/core`.
2. Presta particolare attenzione ai controlli di sicurezza in `src/core/security`.
3. Ignora tutti i file nella directory `tests`.
```

Questo produrrà la seguente sezione nell'output:

```xml
<instruction>
# Istruzioni del Repository
Questo repository contiene il codice sorgente dello strumento Repomix. Per favore segui queste direttive durante l'analisi del codice:
1. Concentrati sulle funzionalità principali nella directory `src/core`.
2. Presta particolare attenzione ai controlli di sicurezza in `src/core/security`.
3. Ignora tutti i file nella directory `tests`.
</instruction>
```
