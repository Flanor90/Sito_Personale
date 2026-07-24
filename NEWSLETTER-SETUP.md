# Attivare la raccolta email (newsletter) — guida in 10 minuti

Il sito raccoglie email in **4 punti** e le invia a **Brevo** (ex-Sendinblue),
azienda UE adatta al GDPR. Tutto è già pronto e funzionante: manca **una sola
cosa**, incollare l'URL del tuo modulo Brevo in `assets/newsletter.js`.

> Finché non lo fai, il sito usa un **ripiego**: al posto dell'invio a Brevo apre
> il programma di posta dell'utente con una mail pre-indirizzata a te — così non
> perdi nessun contatto nel frattempo. Quando Brevo è attivo, il ripiego si
> disattiva da solo.

---

## Dove vengono chieste le email (i "trigger")

| Punto sul sito | Fonte salvata (`FONTE`) |
|---|---|
| Fine di ogni test psicologico | `test` |
| Sezione **Newsletter** (prima dei Contatti) | `newsletter` |
| Footer (tutte le pagine) | `newsletter` |
| Sezione **Compendi** ("Avvisami…") | `compendi` |
| Checkbox nel form Contatti | `newsletter` |

La **fonte** viaggia insieme all'email: in Brevo puoi filtrare/segmentare le
campagne per fonte (es. inviare solo a chi è arrivato dai compendi).

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
