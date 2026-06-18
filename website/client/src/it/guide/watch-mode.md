---
title: Modalità Watch
description: Riimpacchetta automaticamente il tuo codebase quando i file cambiano con la modalità watch di Repomix, inclusi debouncing, gestione delle esclusioni e compatibilità delle opzioni.
---

# Modalità Watch

Repomix può monitorare il tuo codebase e riimpacchettarlo automaticamente ogni volta che i file cambiano. In questo modo il file di output resta aggiornato mentre lavori, il che è comodo quando vuoi fornire a un assistente AI uno snapshot aggiornato di continuo.

## Utilizzo

Avvia la modalità watch con il flag `-w` (oppure `--watch`):

```bash
repomix --watch
```

Repomix esegue un impacchettamento iniziale, poi continua a girare e riimpacchetta a ogni modifica. Puoi combinare la modalità watch con le opzioni abituali:

```bash
# Monitora un insieme specifico di file
repomix -w --include "src/**/*.ts"

# Monitora con un file di output e un formato personalizzati
repomix --watch -o output.md --style markdown
```

Premi `Ctrl+C` per interrompere il monitoraggio.

## Come Funziona

- **Impacchettamento iniziale**: Repomix impacchetta il codebase una volta, poi riporta quanti file sta monitorando.
- **Rilevamento delle modifiche**: file nuovi, modificati ed eliminati attivano tutti un nuovo impacchettamento.
- **Debouncing**: le raffiche rapide di modifiche (per esempio il cambio di branch o il salvataggio di molti file in una volta) vengono raggruppate. Repomix attende `300 ms` dopo l'ultima modifica prima di riimpacchettare, così una serie di edit produce un'unica ricostruzione.
- **Timestamp**: dopo ogni ricostruzione, Repomix stampa un timestamp (`Rebuilt at HH:MM:SS`) così puoi capire quando l'output è stato aggiornato l'ultima volta.

## File Esclusi

La modalità watch rispetta le stesse regole di esclusione di un'esecuzione normale: `.gitignore`, `.repomixignore`, i pattern predefiniti integrati (come `node_modules` e `.git`) e qualsiasi pattern `--ignore` tu passi. Le directory escluse non vengono monitorate, il che mantiene la modalità watch efficiente sui progetti di grandi dimensioni.

## Compatibilità delle Opzioni

La modalità watch funziona solo con directory locali, quindi non può essere combinata con le seguenti opzioni (sia che tu le imposti dalla riga di comando sia nel tuo file di configurazione):

- `--remote` o un URL posizionale di repository remoto: la modalità watch è solo locale
- `--stdout` o `--stdin`: le modalità di streaming non hanno un file di output persistente da aggiornare
- `--split-output`
- `--skill-generate`
- `--copy`: riimpacchettare a ogni modifica sovrascriverebbe ripetutamente gli appunti

Se combini una di queste con `--watch`, Repomix termina con un errore che spiega il conflitto.

## Risorse Correlate

- [Opzioni della Riga di Comando](/it/guide/command-line-options) - Riferimento completo della CLI, incluso `--watch`
- [Utilizzo di Base](/it/guide/usage) - Altri modi per eseguire Repomix
- [Configurazione](/it/guide/configuration) - Imposta le opzioni di output predefinite nel tuo file di configurazione
