# Il pannello di amministrazione — cos'è e come si accende

Il sito raccoglie email da cinque punti diversi (fine dei test, sezione
Newsletter, footer, sezione Compendi, modulo Contatti). Fino a oggi quelle
email finivano solo dentro Brevo, e le richieste di colloquio dipendevano dal
programma di posta del visitatore. Ora esiste un posto dove tutto questo si
vede, si conta e si usa.

**Indirizzo del pannello:** <https://www.albertodelbove-psicologo.it/admin/>

Non c'è nessun link nel sito che ci porti, la pagina è esclusa dai motori di
ricerca (`noindex`), e senza credenziali non mostra una singola riga di dati:
è una schermata di accesso e basta.

---

## Cosa fa

| Sezione | A cosa serve |
|---|---|
| **Cruscotto** | I numeri degli ultimi 30 giorni e gli ultimi arrivi. Avvisa se qualcosa non è configurato. |
| **Contatti** | Ogni email raccolta, da quale punto del sito, se ha confermato. Ricerca, filtri, esportazione CSV, scheda completa con la prova del consenso. |
| **Richieste** | Chi ha compilato il modulo contatti: messaggio intero, temi scelti, stato di lavorazione, link alla scheda Trello. |
| **Newsletter** | Scrittura in markdown con anteprima dal vivo, scelta dei destinatari, prova a te stesso, invio a scaglioni con barra di avanzamento. |
| **Statistiche** | Visite, pagine più viste, provenienza, conversione, azioni sul sito. Per 7 giorni / 30 giorni / 3 mesi / 12 mesi. |
| **Impostazioni** | SMTP, Trello, dati del sito, importazione contatti. |

---

## Come sta in piedi (in breve)

```
   Sito (GitHub Pages)                   Supabase (Irlanda, piano gratuito)
   ────────────────────                  ──────────────────────────────────
   index.html          ──── email ────►  Edge Function "api"  ──►  Postgres
   analytics.js        ──── visite ───►       │                     │
   newsletter.js                              ├─► email di conferma │
                                              └─► scheda Trello     │
                                                                    │
   admin/  ◄──── login + lettura dati ──────────────────────────────┘
      └──── invio newsletter ────────►  Edge Function "admin"
```

Tre cose da sapere, perché spiegano tutte le scelte fatte:

1. **Il sito pubblico non ha nessun permesso sul database.** Non può leggere né
   scrivere niente. Ogni scrittura passa da una funzione sul server. La chiave
   che sta dentro le pagine è pubblica per costruzione e da sola non apre nulla.

2. **Le password (SMTP, Trello) non arrivano mai al browser.** Vivono in una
   tabella che nemmeno tu, da loggato, puoi leggere: il pannello ne vede solo i
   pallini. Le usa esclusivamente il codice sul server.

3. **Il permesso non lo decide il pannello, lo decide il database.** Dopo il
   login, ogni richiesta viene confrontata con la tabella `admin_emails`.
   Modificare il codice del pannello non dà accesso a niente.

---

## Passo 1 — Crea il tuo utente (5 minuti)

Questo devo farlo tu: una password la scegli tu, e non deve passare da nessuno.

1. Vai su <https://supabase.com/dashboard/project/ynmxgdcikqlgcupfszza/auth/users>
2. **Add user → Create new user**
3. Email: `alberto.delbove.psicoterapeuta@gmail.com`
   (dev'essere esattamente questa: è già autorizzata nel database)
4. Scegli una password lunga — è la chiave di tutto l'archivio contatti.
   Usa il gestore di password del Mac, non una che ricordi a memoria.
5. Spunta **Auto Confirm User**, così non devi confermare via email.
6. **Create user**.

Poi, sempre nel pannello Supabase, **Authentication → Sign In / Providers →
Email**: spegni **Enable Sign Ups**. Non serve che nessun altro possa
registrarsi. (Anche lasciandolo acceso non vedrebbero nulla — la tabella
`admin_emails` li fermerebbe — ma è inutile lasciare una porta aperta.)

Ora vai su <https://www.albertodelbove-psicologo.it/admin/> ed entra.
Nel campo utente puoi scrivere **`alberto`** invece dell'email intera.

---

## Passo 2 — Fai partire le email (Gmail)

Senza questo passo il pannello funziona, ma **le email di conferma non
partono**: le iscrizioni restano in attesa e non ricevono la newsletter. Il
cruscotto te lo segnala in rosso finché non è fatto.

### La password per le app

Non è la password del tuo account Google, è una password separata che Google
crea apposta per un programma.

1. <https://myaccount.google.com/security> → attiva la **Verifica in due
   passaggi**, se non l'hai già (senza, il passo successivo non compare).
2. <https://myaccount.google.com/apppasswords>
3. Nome dell'app: `Sito` → **Crea**.
4. Copia le 16 lettere che appaiono. Le vedi una volta sola.

### Nel pannello

**Impostazioni → Invio email**, e compila:

| Campo | Valore |
|---|---|
| Server | `smtp.gmail.com` |
| Porta | `465` |
| Utente | `alberto.delbove.psicoterapeuta@gmail.com` |
| Password per le app | le 16 lettere di prima |
| Nome del mittente | `Alberto Del Bove` |
| Email del mittente | `alberto.delbove.psicoterapeuta@gmail.com` |
| Email per lotto | `25` |

**Salva**, poi **Mandami una prova**: deve arrivarti una email nei colori del
sito. Se arriva, è tutto collegato.

### Il limite di Gmail — leggilo prima di avere 300 iscritti

Gmail consegna circa **500 email al giorno** e non è pensato per gli invii di
massa. Finché gli iscritti sono poche decine va benissimo. Oltre le 200–300,
tre cose cominciano ad andare storte: le email finiscono nello spam più spesso,
Google può sospendere temporaneamente l'invio, e non hai nessun dato su chi ha
aperto.

Quando succederà, non c'è da rifare niente: si cambiano soltanto i quattro
campi qui sopra con quelli di un servizio pensato per le newsletter (Brevo ne
offre uno SMTP, 300 al giorno gratis, con una consegna molto migliore). Il
resto del pannello non se ne accorge.

---

## Passo 3 — Trello (facoltativo)

Serve se vuoi che ogni richiesta di colloquio diventi da sola una scheda nella
tua bacheca.

1. <https://trello.com/power-ups/admin> → **New** → crea un Power-Up con un
   nome qualsiasi (es. "Sito").
2. Aprilo → scheda **API key** → copia la **chiave**.
3. Accanto alla chiave c'è la parola **Token**: cliccala, autorizza, copia il
   token lungo che appare.
4. Nel pannello, **Impostazioni → Trello**: incolla chiave e token →
   **Salva credenziali** → **Carica le bacheche**.
5. Scegli la bacheca, la lista dove vuoi le richieste di colloquio, e —
   se ti va — una lista separata per le semplici iscrizioni.
6. Spunta **Crea le schede automaticamente** → **Salva**.

Se Trello non risponde, la richiesta della persona viene salvata lo stesso:
non ho voluto che un servizio esterno potesse far fallire un primo contatto.
Dalla scheda della richiesta puoi sempre creare la scheda a mano.

---

## Accesso per megamind (sola lettura)

Megamind ha bisogno di **leggere** iscritti e statistiche per decidere cosa
scrivere. Non deve poter inviare newsletter né cancellare contatti: quelle
restano decisioni tue. Per questo esistono due ruoli.

Per abilitarlo:

1. Crea un secondo utente Supabase (stessa procedura del Passo 1), con
   un'email dedicata, per esempio `megamind@albertodelbove-psicologo.it`.
2. Nel SQL Editor di Supabase esegui:

   ```sql
   insert into public.admin_emails (email, ruolo)
   values ('megamind@albertodelbove-psicologo.it', 'lettura');
   ```

3. Consegna a megamind queste tre cose:
   - indirizzo: `https://ynmxgdcikqlgcupfszza.supabase.co`
   - chiave pubblica: `sb_publishable_1aC6c8mV1w4clhwbJWKd_A_OGL4VZEp`
   - email e password dell'utente creato

**Cosa può fare, in concreto.** Fa login su `/auth/v1/token?grant_type=password`
e poi legge via API:

| Cosa | Come |
|---|---|
| Iscritti | `GET /rest/v1/contacts?select=*&order=created_at.desc` |
| Solo i confermati | `GET /rest/v1/contacts?status=eq.confirmed&consent_newsletter=is.true` |
| Richieste di colloquio | `GET /rest/v1/messages?select=*` |
| Numeri di sintesi | `POST /rest/v1/rpc/stats_overview` con `{p_from, p_to}` |
| Andamento | `POST /rest/v1/rpc/stats_timeseries` con `{p_from, p_to, p_bucket}` |
| Pagine più viste | `POST /rest/v1/rpc/stats_pages` |
| Dove lasciano l'email | `POST /rest/v1/rpc/stats_contact_sources` |
| Newsletter già inviate | `GET /rest/v1/newsletters?select=*` |

Ogni tentativo di scrivere viene rifiutato dal database, non dal buon senso del
programma: la regola sta nelle policy RLS, e vale anche se megamind sbaglia
richiesta. Per revocare l'accesso basta cancellare l'utente da Supabase.

---

## Gli obblighi di legge, e come sono coperti

Trattandosi di un sito clinico, i dati raccolti meritano più attenzione della
media. Cosa c'è già:

- **Doppia conferma.** Chi lascia l'email riceve un messaggio con un link:
  finché non clicca, resta in attesa e non riceve nessuna newsletter.
  Il database rifiuta di includere nei destinatari chi non ha confermato.
- **Prova del consenso.** Per ogni contatto restano scritti quando, da quale
  punto del sito e da quale browser è arrivato il consenso. Lo vedi nella
  scheda del contatto.
- **Disiscrizione con un click.** In fondo a ogni email, più l'intestazione
  tecnica che fa comparire il pulsante "Annulla iscrizione" dentro Gmail.
- **Diritto alla cancellazione.** Nella scheda di un contatto, *Elimina
  definitivamente* rimuove contatto e storia in un colpo solo.
- **Dati in UE.** Il server è in Irlanda.
- **Niente cookie, niente IP.** Le statistiche non usano cookie e non salvano
  indirizzi IP: per questo il sito non ha bisogno del banner dei cookie.
- **Le risposte dei test non lasciano mai il browser.** Come prima. Viaggia solo
  l'email che la persona sceglie di lasciare.

---

## Manutenzione

**Il progetto va in pausa dopo 7 giorni senza attività.** Con il sito che invia
le visite non succede. Se dovesse capitare (per esempio dopo una settimana di
sito irraggiungibile), si riattiva da solo dal pannello Supabase, senza perdere
niente.

**Se cambi qualcosa nel codice del server** (`supabase/functions/`), ricordati
che `_lib/` è la sorgente e le cartelle `lib/` dentro le funzioni sono copie:

```bash
./supabase/sync-lib.sh
```

**Test automatici** — 75 test coprono la logica dei test psicologici, la
raccolta email, il convertitore markdown delle newsletter e le promesse sulla
privacy del tracciamento:

```bash
npm test
```

**Se aggiungi classi CSS nuove** al sito (non al pannello, che ha il suo foglio
di stile separato):

```bash
npm run build:css
```

---

## Se qualcosa non va

| Sintomo | Dove guardare |
|---|---|
| «Nome utente o password non corretti» | L'utente esiste su Supabase? L'email è esattamente quella autorizzata? |
| L'email di prova non arriva | La password per le app è di 16 lettere senza spazi? La verifica in due passaggi è attiva? |
| Le iscrizioni restano «da confermare» | Manca l'SMTP: senza, l'email di conferma non parte. Vedi il Passo 2. |
| Le schede Trello non nascono | Impostazioni → Trello → *Prova il collegamento*. Il token scade se lo revochi da Trello. |
| Il pannello dice «Accesso negato» | La tua email non è in `admin_emails`, o ha ruolo `lettura`. |
| Statistiche a zero | Normale il primo giorno: i dati partono da quando il sito è stato pubblicato con `analytics.js`. |

I registri delle funzioni sul server (utili quando un invio fallisce) stanno in
**Supabase → Edge Functions → api / admin → Logs**.
