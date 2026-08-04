# Credenziali — quali servono, dove si creano, dove si incollano

Una pagina sola, da spuntare dall'alto verso il basso. Il dettaglio di ogni
passo sta in [PANNELLO-SETUP.md](PANNELLO-SETUP.md); qui c'è la mappa.

> ## ⚠️ Regola che vale sopra tutte
> **Non incollare mai una password dentro un file di questa cartella.**
> La repo `Flanor90/Sito_Personale` è **pubblica** su GitHub: qualunque cosa
> scritta in un file e mandata online è leggibile da chiunque, per sempre,
> anche se poi la cancelli (resta nella storia dei commit).
>
> Le credenziali si incollano **solo** in due posti: il pannello di Supabase
> (per il tuo utente) e il pannello del sito (per SMTP e Trello). In entrambi
> i casi finiscono sul server, non nel codice.

---

## Le quattro cose che servono

| # | Cosa | Dove la crei | Dove la incolli | Serve per |
|---|---|---|---|---|
| 1 | **Utente e password del pannello** | Supabase | *(la usi per entrare)* | Accedere a `/admin/` |
| 2 | **Password per le app di Google** | Account Google | Pannello → Impostazioni | Far partire le email |
| 3 | **Chiave e token Trello** | Trello | Pannello → Impostazioni | Creare le schede da sole |
| 4 | **Utente per megamind** | Supabase | *(la dai a megamind)* | Fargli leggere i dati |

Le prime due sono necessarie. La terza e la quarta sono comodità: senza, il
resto funziona lo stesso.

---

## 1. Utente e password del pannello — **fallo per primo**

Senza questo non entri, e il pannello non serve a niente.

**Dove:** <https://supabase.com/dashboard/project/ynmxgdcikqlgcupfszza/auth/users>
(entri con l'account Supabase che hai già)

**Cosa fare:** *Add user* → *Create new user*

- Email: `alberto.delbove.psicoterapeuta@gmail.com` — **deve essere esattamente
  questa**, è l'unica già autorizzata nel database.
- Password: **scegline una lunga e salvala nel portachiavi del Mac.**
  È la chiave dell'intero archivio contatti: se la perdi, la reimposti da
  Supabase; se qualcuno la indovina, ha tutto.
- Spunta **Auto Confirm User**.

**Poi:** *Authentication → Sign In / Providers → Email* → spegni **Enable Sign Ups**.
Nessun altro deve potersi registrare.

**Come entri:** su `/admin/` scrivi `alberto` (non serve l'email intera) e la
password che hai scelto.

---

## 2. Password per le app di Google — **fallo per secondo**

Non è la password del tuo account Google. È una password separata di 16 lettere
che Google genera per un singolo programma, e che puoi revocare quando vuoi
senza toccare l'account.

**Prima:** serve la verifica in due passaggi attiva, altrimenti la pagina non
compare → <https://myaccount.google.com/security>

**Dove:** <https://myaccount.google.com/apppasswords>
Nome dell'app: `Sito` → *Crea* → copia le 16 lettere. **Le vedi una volta sola.**

**Dove la incolli:** pannello → **Impostazioni → Invio email**

| Campo | Valore |
|---|---|
| Server | `smtp.gmail.com` |
| Porta | `465` |
| Utente | `alberto.delbove.psicoterapeuta@gmail.com` |
| Password per le app | le 16 lettere |
| Nome del mittente | `Alberto Del Bove` |
| Email del mittente | `alberto.delbove.psicoterapeuta@gmail.com` |

*Salva* → *Mandami una prova*. Se ti arriva l'email, è fatta.

**Dove finisce:** in una tabella del server che nemmeno tu, da loggato, puoi
leggere — il pannello ti mostra solo `••••••••`. La usa unicamente il codice
che invia le email.

**Se non lo fai:** il pannello funziona, ma chi si iscrive non riceve l'email di
conferma, quindi resta "in attesa" e non riceverà mai la newsletter. Il
cruscotto te lo segnala in rosso finché non è sistemato.

---

## 3. Chiave e token Trello — facoltativo

Serve solo se vuoi che ogni richiesta di colloquio diventi da sola una scheda.

**Dove:** <https://trello.com/power-ups/admin>

1. *New* → crea un Power-Up con un nome qualsiasi (es. `Sito`).
2. Aprilo → scheda **API key** → copia la **chiave**.
3. Accanto alla chiave c'è la parola **Token**: cliccala, autorizza, copia il
   token lungo.

**Dove le incolli:** pannello → **Impostazioni → Trello** → *Salva credenziali*
→ *Carica le bacheche* → scegli bacheca e liste → spunta *Crea le schede
automaticamente* → *Salva*.

**Se Trello smette di rispondere** la richiesta della persona viene salvata lo
stesso: non ho voluto che un servizio esterno potesse far perdere un primo
contatto.

---

## 4. Utente per megamind — facoltativo, in sola lettura

Perché megamind possa leggere iscritti e statistiche e decidere cosa scrivere,
senza poter inviare né cancellare niente.

1. Su Supabase crea un **secondo** utente (stessa procedura del punto 1) con
   un'email dedicata, per esempio `megamind@albertodelbove-psicologo.it`, e una
   password diversa dalla tua.
2. Nel **SQL Editor** di Supabase esegui:

   ```sql
   insert into public.admin_emails (email, ruolo)
   values ('megamind@albertodelbove-psicologo.it', 'lettura');
   ```

3. A megamind servono tre cose: l'indirizzo `https://ynmxgdcikqlgcupfszza.supabase.co`,
   la chiave pubblica `sb_publishable_1aC6c8mV1w4clhwbJWKd_A_OGL4VZEp`
   (è pubblica per costruzione, non è un segreto), e la coppia email/password
   appena creata.

Il ruolo `lettura` non è una gentile richiesta: è il database a rifiutare ogni
scrittura. Per revocare l'accesso, cancella l'utente da Supabase.

---

## Cosa NON è una credenziale (e sta giustamente nel codice)

Due valori compaiono in chiaro nei file, e va bene così:

- `https://ynmxgdcikqlgcupfszza.supabase.co` — è l'indirizzo del server.
- `sb_publishable_1aC6c8mV1w4clhwbJWKd_A_OGL4VZEp` — è la **chiave
  pubblicabile**, nata per stare dentro le pagine web.

Da sola quella chiave non apre niente: le regole del database non concedono
nessun permesso a chi non ha fatto login. L'ho verificato — un visitatore
anonimo che prova a leggere la tabella dei contatti riceve un rifiuto.

---

## Se qualcosa va storto

| Sintomo | Cosa controllare |
|---|---|
| «Nome utente o password non corretti» | L'utente esiste su Supabase? L'email è esattamente quella autorizzata? |
| L'email di prova non arriva | 16 lettere senza spazi? Verifica in due passaggi attiva? Porta 465? |
| «Trello ha risposto 401» | Il token è stato revocato: rigeneralo e reincollalo. |
| «Accesso negato» dentro il pannello | La tua email non è in `admin_emails`, o ha ruolo `lettura`. |
| Hai incollato una password in un file per sbaglio | Non basta cancellarla: **cambia subito quella password** alla fonte. La storia di Git la conserva. |
