# Sicurezza

## Funzionalità di Controllo Sicurezza

Repomix utilizza [Secretlint](https://github.com/secretlint/secretlint) per rilevare informazioni sensibili nei tuoi file:
- Chiavi API
- Token di accesso
- Credenziali
- Chiavi private
- Variabili d'ambiente

## Configurazione

I controlli di sicurezza sono abilitati per impostazione predefinita.

Disabilitazione tramite CLI:
```bash
repomix --no-security-check
```

O in `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Misure di Sicurezza

1. **Gestione file binari**: I contenuti dei file binari sono esclusi dall'output, ma i loro percorsi sono elencati nella struttura delle directory per una panoramica completa del repository
2. **Compatibile con Git**: Rispetta i pattern `.gitignore`
3. **Rilevamento automatizzato**: Analizza i problemi di sicurezza comuni:
    - Credenziali AWS
    - Stringhe di connessione ai database
    - Token di autenticazione
    - Chiavi private

## Quando il Controllo di Sicurezza Trova Problemi

Esempio di output:
```bash
🔍 Controllo sicurezza:
────────────────────────────
2 file sospetti rilevati ed esclusi:
1. config/credentials.json
  - Chiave di accesso AWS trovata
2. .env.local
  - Password del database trovata
```

## Best Practice

1. Esaminare sempre l'output prima di condividerlo
2. Usare `.repomixignore` per percorsi sensibili
3. Mantenere i controlli di sicurezza abilitati
4. Rimuovere i file sensibili dal repository

## Segnalazione Problemi di Sicurezza

Hai trovato una vulnerabilità di sicurezza? Per favore:
1. Non aprire un ticket pubblico
2. Invia un'email a: koukun0120@gmail.com
3. Oppure usa gli [Avvisi di Sicurezza GitHub](https://github.com/yamadashy/repomix/security/advisories/new)
