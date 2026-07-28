# Raccolta email (newsletter) — com'è configurata

Il sito raccoglie email in **4 punti** e le invia a **Brevo** (ex-Sendinblue),
azienda UE adatta al GDPR.

> **Stato: attivo dal 29/07/2026.** Modulo Brevo «Sito terapeuta - iscrizione
> newsletter» (account *Psicovoice*), lista **Sito terapeuta – Newsletter**,
> **double opt-in attivo**, campi `EMAIL` + `NOME` + `FONTE`. L'URL è già in
> `CONFIG.endpoints.default` dentro `assets/newsletter.js`.

Il vecchio ripiego `fallbackMailto` è **spento**: apriva il programma di posta
del visitatore, che su mobile spesso non parte — i contatti si perdevano senza
che nessuno se ne accorgesse. Riaccendilo solo se disattivi Brevo.

**Brevo è solo la casella d'ingresso**, non lo strumento di invio: le newsletter
si mandano da SoBuddy (brand `terapeuta`), importando i contatti confermati con
`mailer importa`. Il double opt-in di Brevo resta la prova del consenso.

Le sezioni che seguono servono se un giorno devi rifare o cambiare il modulo.

---

## Dove vengono chieste le email (i "trigger")

| Punto sul sito | Fonte salvata (`FONTE`) |
|---|---|
| Fine di ogni test psicologico | `test-junghiano`, `test-burnout`, `test-adhd`, `test-domanda` |
| Sezione **Newsletter** (prima dei Contatti) | `newsletter` |
| Footer (tutte le pagine) | `newsletter` |
| Sezione **Compendi** ("Avvisami…") | `compendi` |
| Checkbox nel form Contatti | `newsletter` |

La **fonte** viaggia insieme all'email: in Brevo puoi filtrare/segmentare le
campagne per fonte (es. inviare solo a chi è arrivato dai compendi).

Dai test la fonte dice **quale** test è stato completato (`test-adhd`,
`test-burnout`…): è ciò che ti permette di far partire una sequenza di email
sul tema giusto invece di una newsletter generica. Se in `endpoints` metti un
URL sotto la chiave `test`, vale per tutte e quattro le varianti — la fonte
granulare ricade sulla sua famiglia, e poi su `default`. Metti un URL sotto
`test-adhd` solo se vuoi una lista separata per quel singolo test.

> Privacy: le **risposte dei test non lasciano mai il browser**. Viaggia solo
> l'email che la persona sceglie di lasciare, con doppio consenso (checkbox +
> double opt-in di Brevo).

---

## Passo 1 — Crea l'account Brevo (gratis)

1. Vai su <https://www.brevo.com> → **Registrati** (piano gratuito: contatti
   illimitati, 300 email/giorno).
2. Completa il profilo mittente con il tuo nome e la tua email.

## Passo 2 — Crea gli attributi dei contatti

In Brevo: **Contatti → Impostazioni → Attributi dei contatti → Aggiungi un attributo.**
Crea (tipo **Testo**):

- **`NOME`** — (facoltativo) il nome dell'iscritto
- **`FONTE`** — la provenienza (`test`, `newsletter`, `compendi`…)

(`EMAIL` esiste già di default.)

## Passo 3 — Crea una lista e un modulo con double opt-in

1. **Contatti → Liste → Crea una lista** (es. "Sito – Newsletter").
2. **Contatti → Moduli → Crea un modulo.**
   - Aggiungi i campi **EMAIL**, e (se vuoi) **NOME** e **FONTE**.
   - In **Impostazioni del modulo** attiva il **Double opt-in** (obbligatorio per
     il GDPR): l'iscritto riceve una mail di conferma.
   - Scegli la lista creata al punto 1.
3. Salva e vai su **Condividi / Ottieni il codice**: cerca nell'HTML la riga

   ```html
   <form ... action="https://sibforms.com/serve/MUIF...." ...>
   ```

   **Copia l'URL dentro `action`** (quello che inizia con `https://sibforms.com/serve/`).

## Passo 4 — Incolla l'URL nel sito

Apri `assets/newsletter.js` e compila `CONFIG.endpoints`:

```js
endpoints: {
  default:    'https://sibforms.com/serve/MUIF....',   // <-- incolla qui
  newsletter: '',
  test:       '',
  compendi:   '',
  psicovoice: ''
},
```

- **Un solo URL basta**: mettilo in `default` e tutte le fonti useranno quel
  modulo (la provenienza resta salvata nell'attributo `FONTE`).
- **Vuoi liste separate** (una per newsletter, una per compendi…)? Crea più
  moduli Brevo e incolla un URL diverso per ogni fonte.

Poi metti a `false` il ripiego, ora non più necessario:

```js
fallbackMailto: false,
```

## Passo 5 — Pubblica

```bash
git add assets/newsletter.js && git commit -m "Attiva Brevo per la newsletter" && git push
```

GitHub Pages aggiorna il sito in un paio di minuti.

---

## Provare che funziona

1. Apri il sito, vai nella sezione **Newsletter**, inserisci una tua email e
   spunta il consenso → **Iscrivimi**.
2. Deve comparire "Ti ho inviato una email di conferma…".
3. Controlla la posta: arriva la mail di conferma di Brevo → clicca il link.
4. In Brevo, **Contatti**, deve comparire il nuovo iscritto con `FONTE = newsletter`.

## Se i nomi degli attributi in Brevo sono diversi

Se hai chiamato gli attributi in modo diverso (es. `PROVENIENZA` invece di
`FONTE`), aggiorna la mappa in `assets/newsletter.js`:

```js
fields: { email: 'EMAIL', name: 'NOME', source: 'FONTE' },
```

## Note tecniche

- Il sito è statico (GitHub Pages): nessun backend, nessuna API key nel browser.
  L'invio avviene con un POST verso un `<iframe>` nascosto → niente problemi di
  CORS e nessun segreto esposto.
- Il double opt-in di Brevo è la vera conferma dell'iscrizione: per questo il
  messaggio dice sempre "controlla la tua email".
- Testi in italiano, inglese e spagnolo sono già pronti (`assets/i18n.js`).
- Se aggiungi nuove classi CSS all'HTML o ai JS, ricompila: `npm run build:css`.
