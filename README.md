# SeaTrainer - Gestione Valutazioni Istruttori Marini

Applicazione web per la gestione di allievi istruttori marini di base, con valutazioni tecniche dettagliate, accesso multi-utente con password modificabile.

## Funzionalità

- **Autenticazione utenti**: registrazione e login con email/password
- **Cambio password personale** per ogni utente
- **Gestione allievi**: creazione, modifica, eliminazione
- **Anagrafica allievo**: Nome, Cognome, Indirizzo, Data nascita, Certificato medico sportivo, Certificato BLSD, Altri brevetti
- **Valutazioni tecniche** per 20 abilità specifiche:
  - Punteggio da 1 a 10 per ogni abilità
  - Campo note editabile e cancellabile per ogni abilità
- **Persistenza dati** su Firebase Firestore (cloud)
- **Interfaccia responsive** e intuitiva

## Tecnologie utilizzate

- HTML5, CSS3, JavaScript (Vanilla)
- Firebase Authentication (gestione utenti)
- Firebase Firestore (database NoSQL in tempo reale)

## Prerequisiti

- Un account Google (per Firebase)
- Node.js (opzionale, solo per hosting locale)

## Configurazione e installazione

### 1. Crea un progetto su Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuovo progetto (es. "SeaTrainer")
3. Nel pannello sinistro, attiva **Authentication** → metodo di accesso "Email/Password"
4. Attiva **Firestore Database** → crea database in modalità di test (le regole di sicurezza verranno modificate dopo)

### 2. Ottieni le credenziali Firebase

- Vai su **Impostazioni progetto** → "Le tue app" → Crea una nuova app web
- Copia l'oggetto `firebaseConfig` con i tuoi dati (apiKey, authDomain, ecc.)

### 3. Configura l'applicazione

Apri il file `index.html` e sostituisci la sezione `firebaseConfig` con i tuoi dati:

```javascript
const firebaseConfig = {
    apiKey: "LA_TUA_API_KEY",
    authDomain: "il-tuo-auth-domain",
    projectId: "il-tuo-project-id",
    storageBucket: "il-tuo-storage-bucket",
    messagingSenderId: "il-tuo-sender-id",
    appId: "il-tuo-app-id"
};