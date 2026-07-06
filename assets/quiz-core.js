/* ============================================================
   quiz-core.js — logica pura dei test interattivi
   ------------------------------------------------------------
   Unica fonte di verità per i contenuti e il punteggio dei tre
   strumenti. Nessun accesso al DOM: tutto è funzione pura, così
   può girare sia nel browser (window.QuizCore) sia in Node
   (module.exports) per i test automatici.
   Nessun dato lascia mai il dispositivo dell'utente.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QuizCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LIKERT = ['Mai o quasi mai', 'A volte', 'Spesso', 'Quasi sempre'];

  var jungProfiles = {
    'EST': {
      title: 'Il Pragmatico Dinamico',
      desc: 'Trai energia dal contatto con gli altri e la incanali in azioni concrete. Sei la persona che "fa accadere le cose": osservi la realtà con lucidità, decidi in fretta e ti assumi responsabilità senza tirarti indietro.',
      forza: ['Capacità di decidere e agire anche sotto pressione', 'Concretezza: trasformi le idee in risultati misurabili', 'Energia che mette in moto le persone intorno a te'],
      attenzione: ['Rallentare per sentire, non solo per fare: le emozioni non sono ostacoli al piano', 'Tollerare ciò che non si può risolvere subito']
    },
    'ESF': {
      title: 'L\'Accogliente Concreto',
      desc: 'Unisci calore relazionale e senso pratico: ti prendi cura degli altri con gesti tangibili e presenza reale, e le persone si sentono naturalmente a loro agio con te. Sei spesso il collante silenzioso dei tuoi gruppi.',
      forza: ['Calore e presenza: le persone si sentono viste da te', 'Attenzione pratica ai bisogni concreti degli altri', 'Capacità di costruire armonia nei gruppi'],
      attenzione: ['Riconoscere i tuoi bisogni prima di esaurirti', 'Dire di no senza sentirti in colpa']
    },
    'ENT': {
      title: 'Lo Stratega Visionario',
      desc: 'Vedi possibilità dove altri vedono ostacoli e sai trascinare gli altri nei tuoi progetti. Ragioni in grande, ami le sfide intellettuali e il cambiamento non ti spaventa: ti accende.',
      forza: ['Visione: colleghi punti che gli altri non vedono ancora', 'Coraggio del cambiamento e delle sfide ambiziose', 'Leadership naturale nei progetti complessi'],
      attenzione: ['Pazienza con i tempi — e le emozioni — tue e degli altri', 'Trattare la vulnerabilità come informazione, non come inefficienza']
    },
    'ENF': {
      title: 'L\'Ispiratore Empatico',
      desc: 'Hai un talento raro: percepire il potenziale delle persone e aiutarle a crederci. Comunichi con passione, crei legami profondi e cerchi un senso autentico in ciò che fai.',
      forza: ['Vedi il potenziale delle persone e sai accenderlo', 'Comunicazione che crea legami autentici', 'Ricerca di senso che dà profondità a ciò che fai'],
      attenzione: ['Confini: puoi ispirare gli altri senza farti carico di tutto', 'Distinguere le tue emozioni da quelle che assorbi']
    },
    'IST': {
      title: 'L\'Analista Metodico',
      desc: 'Sei preciso, affidabile e profondo: osservi prima di agire, verifichi prima di credere, e quando dai la tua parola la mantieni. La tua solidità è un punto di riferimento per chi ti conosce.',
      forza: ['Affidabilità e rigore: la tua parola vale', 'Osservazione fine, prima dell\'azione', 'Solidità nei momenti in cui gli altri vacillano'],
      attenzione: ['Concederti margini di imperfezione', 'Lasciar vedere anche ciò che si muove sotto la superficie']
    },
    'ISF': {
      title: 'Il Custode Sensibile',
      desc: 'Coltivi la profondità nelle relazioni che contano e noti ciò che agli altri sfugge: un tono di voce diverso, un dettaglio fuori posto, un bisogno non detto. Preferisci la sostanza alla scena.',
      forza: ['Profondità nelle relazioni che contano davvero', 'Noti le sfumature e i bisogni non detti', 'Cura discreta, senza bisogno di riflettori'],
      attenzione: ['Dare voce a ciò che provi, prima che il non detto diventi distanza', 'Chiedere ciò che ti serve, non solo offrirlo']
    },
    'INT': {
      title: 'Il Pensatore Profondo',
      desc: 'La tua mente è il tuo laboratorio: colleghi idee, costruisci modelli, cerchi il principio dietro i fenomeni. Hai una visione autonoma e originale, e raramente ti accontenti delle spiegazioni di superficie.',
      forza: ['Pensiero originale e indipendente', 'Capacità di costruire modelli e vedere principi', 'Autonomia dal giudizio superficiale'],
      attenzione: ['Condividere i pensieri prima che siano "perfetti"', 'Fidarti del confronto: gli altri possono arricchire il modello']
    },
    'INF': {
      title: 'Il Riflessivo Empatico',
      desc: 'Vivi un\'intensa vita interiore e senti le sfumature emotive con una profondità che pochi immaginano da fuori. Cerchi autenticità e significato in ogni cosa, e le relazioni superficiali ti stancano.',
      forza: ['Vita interiore ricca e sensibilità rara', 'Autenticità: cerchi il vero, non l\'apparenza', 'Empatia profonda per chi ti sta accanto'],
      attenzione: ['Proteggere la sensibilità senza isolarti', 'Ricordare che il tuo sguardo serve, anche quando non ti senti capito']
    }
  };

  function axisBar(labelSx, labelDx, valSx, valDx) {
    var pct = Math.round(valSx / (valSx + valDx) * 100);
    return '<div class="mb-3">' +
      '<div class="flex justify-between text-xs font-semibold text-inchiostro/60 mb-1"><span>' + labelSx + ' ' + pct + '%</span><span>' + labelDx + ' ' + (100 - pct) + '%</span></div>' +
      '<div class="h-2.5 bg-tortora rounded-full overflow-hidden"><div class="h-full bg-salvia-600 rounded-full" style="width:' + pct + '%"></div></div>' +
      '</div>';
  }

  var TESTS = {
    junghiano: {
      nome: 'test di personalità junghiano',
      chip: 'Personalità · ispirazione junghiana',
      questions: [
        { text: 'Dopo una settimana intensa, cosa ti ricarica davvero?', options: [
          { label: 'Stare con altre persone: uscire, parlare, condividere', add: { E: 1 } },
          { label: 'Del tempo solo per me: silenzio, una passeggiata, un libro', add: { I: 1 } }
        ]},
        { text: 'In un gruppo di lavoro o tra amici, tendi a…', options: [
          { label: 'Pensare ad alta voce: le idee mi si chiariscono parlando', add: { E: 1 } },
          { label: 'Ascoltare e riflettere prima: intervengo quando ho elaborato', add: { I: 1 } }
        ]},
        { text: 'La tua serata ideale, in un periodo normale?', options: [
          { label: 'Movimento: gente nuova, posti vivi, piani che nascono all\'ultimo', add: { E: 1 } },
          { label: 'Intimità: poche persone care, o una serata tutta per me', add: { I: 1 } }
        ]},
        { text: 'Quando affronti una situazione nuova, ti fidi di più…', options: [
          { label: 'Dei fatti concreti: dati, esperienza, ciò che si può osservare', add: { S: 1 } },
          { label: 'Delle intuizioni: collegamenti, possibilità, ciò che potrebbe essere', add: { N: 1 } }
        ]},
        { text: 'Raccontando un ricordo importante, ti concentri su…', options: [
          { label: 'I dettagli: luoghi, parole esatte, la sequenza dei momenti', add: { S: 1 } },
          { label: 'Il significato: cosa ha rappresentato, come ti ha cambiato', add: { N: 1 } }
        ]},
        { text: 'Quando immagini un progetto che ti entusiasma…', options: [
          { label: 'Parto dai passi concreti: da dove si comincia, cosa serve', add: { S: 1 } },
          { label: 'Parto dalla visione d\'insieme: dove può arrivare, cosa può diventare', add: { N: 1 } }
        ]},
        { text: 'Davanti a una decisione difficile, il tuo primo criterio è…', options: [
          { label: 'La coerenza logica: pro e contro, cosa è più giusto oggettivamente', add: { T: 1 } },
          { label: 'L\'impatto sulle persone: cosa sento e come ne risentiranno gli altri', add: { F: 1 } }
        ]},
        { text: 'Un amico ti racconta un problema. Istintivamente…', options: [
          { label: 'Cerchi soluzioni: analizzi il problema e proponi strade', add: { T: 1 } },
          { label: 'Accogli l\'emozione: prima di tutto vuoi che si senta capito', add: { F: 1 } }
        ]},
        { text: 'Un buon feedback, per te, è soprattutto…', options: [
          { label: 'Diretto e onesto: meglio una verità scomoda che un giro di parole', add: { T: 1 } },
          { label: 'Attento: conta anche come farà sentire chi lo riceve', add: { F: 1 } }
        ]}
      ],
      result: function (s) {
        // Confronti con fallback a 0: un polo mai scelto resta undefined e
        // `3 > undefined` è false, il che invertirebbe erroneamente il risultato.
        var code = ((s.E || 0) > (s.I || 0) ? 'E' : 'I') +
                   ((s.S || 0) > (s.N || 0) ? 'S' : 'N') +
                   ((s.T || 0) > (s.F || 0) ? 'T' : 'F');
        var p = jungProfiles[code];
        var html =
          '<p class="text-center max-w-xl mx-auto">' + p.desc + '</p>' +
          '<div class="grid sm:grid-cols-2 gap-5 mt-6">' +
            '<div class="bg-salvia-50 rounded-2xl p-5"><p class="font-semibold text-notte mb-2.5">I tuoi punti di forza</p><ul class="space-y-2 text-sm">' +
              p.forza.map(function (f) { return '<li class="flex gap-2"><span class="text-salvia-600 font-bold" aria-hidden="true">✦</span><span>' + f + '</span></li>'; }).join('') +
            '</ul></div>' +
            '<div class="bg-crema rounded-2xl p-5"><p class="font-semibold text-notte mb-2.5">Dove cresce il tuo margine</p><ul class="space-y-2 text-sm">' +
              p.attenzione.map(function (f) { return '<li class="flex gap-2"><span class="text-salvia-600 font-bold" aria-hidden="true">→</span><span>' + f + '</span></li>'; }).join('') +
            '</ul></div>' +
          '</div>' +
          '<div class="mt-7"><p class="font-semibold text-notte mb-3">I tuoi assi junghiani</p>' +
            axisBar('Estroversione', 'Introversione', s.E || 0, s.I || 0) +
            axisBar('Sensazione', 'Intuizione', s.S || 0, s.N || 0) +
            axisBar('Pensiero', 'Sentimento', s.T || 0, s.F || 0) +
          '</div>';
        return { kicker: 'Il tuo profilo', title: p.title, code: 'PROFILO ' + code, html: html,
          share: 'il mio profilo è risultato: ' + p.title + ' (' + code + ')',
          report: {
            kind: 'profilo',
            testName: 'Che tipo psicologico sei?',
            intro: 'Profilo di personalità di ispirazione junghiana',
            title: p.title,
            code: 'Profilo ' + code,
            description: p.desc,
            lists: [
              { heading: 'I tuoi punti di forza', items: p.forza },
              { heading: 'Dove cresce il tuo margine', items: p.attenzione }
            ],
            bars: [
              { left: 'Estroversione', right: 'Introversione', leftVal: s.E || 0, rightVal: s.I || 0 },
              { left: 'Sensazione', right: 'Intuizione', leftVal: s.S || 0, rightVal: s.N || 0 },
              { left: 'Pensiero', right: 'Sentimento', leftVal: s.T || 0, rightVal: s.F || 0 }
            ]
          }
        };
      }
    },

    burnout: {
      nome: 'test sul carico lavorativo',
      chip: 'Stress lavorativo & burnout',
      questions: [
        'Mi sveglio già stanco, al pensiero della giornata di lavoro che mi aspetta.',
        'A fine giornata mi sento svuotato: non restano energie per il resto della mia vita.',
        'Mi accorgo di essere diventato più cinico o distaccato verso il mio lavoro.',
        'Mi irrito con colleghi, clienti o utenti più di quanto vorrei.',
        'Ho la sensazione che i miei sforzi non producano risultati che contano.',
        'Faccio fatica a staccare: il lavoro mi segue la sera e nel weekend.',
        'Il sonno non mi ristora, o fatico ad addormentarmi per i pensieri.',
        'Ho rinunciato ad attività o relazioni che mi facevano stare bene, per mancanza di energie.'
      ].map(function (t) {
        return { text: t, options: LIKERT.map(function (l, i) { return { label: l, add: { P: i } }; }) };
      }),
      result: function (s) {
        var tot = s.P || 0;
        var bands = [
          { max: 6, nome: 'Energie in equilibrio', colore: 'text-emerald-700 bg-emerald-100',
            testo: 'Il lavoro sembra costarti il giusto: le energie si consumano, ma si rigenerano. È il momento migliore per prenderti cura degli equilibri che funzionano — le pause vere, i confini chiari, gli spazi che non sono lavoro.',
            tips: ['Proteggi i rituali che ti ricaricano: sono la tua assicurazione sul futuro', 'Tieni d\'occhio i periodi di picco: il logorio comincia sempre in silenzio'] },
          { max: 12, nome: 'Primi segnali di logorio', colore: 'text-amber-700 bg-amber-100',
            testo: 'Qualcosa ha cominciato a pesare: stanchezza che si accumula, staccare che diventa difficile. Non è un allarme, ma è il momento giusto per capire cosa sta drenando energia — prima che diventi un\'abitudine.',
            tips: ['Prova a individuare la fonte principale: carico, relazioni o mancanza di riconoscimento?', 'Rimetti in agenda ciò che hai tagliato "per mancanza di tempo"', 'Se il quadro non migliora in qualche settimana, parlane con qualcuno'] },
          { max: 18, nome: 'Zona di allerta', colore: 'text-orange-700 bg-orange-100',
            testo: 'Il carico sta erodendo energie, lucidità e motivazione: sei nella zona in cui il logorio comincia a lasciare tracce — sul sonno, sull\'umore, sulle relazioni. Le tue risorse meritano più rispetto di così.',
            tips: ['Non aspettare che passi da solo: a questo livello accade raramente', 'Rivedi carichi e aspettative con qualcuno di cui ti fidi', 'Un colloquio con un professionista può aiutarti a leggere cosa sta succedendo'] },
          { max: 24, nome: 'Carico critico', colore: 'text-red-700 bg-red-100',
            testo: 'Le tue risposte descrivono un carico molto alto, con segnali importanti di esaurimento. Non è debolezza: è il segnale che il rapporto tra te e il tuo lavoro ha bisogno di essere ripensato, con un supporto adeguato.',
            tips: ['Parlane presto con un professionista della salute mentale', 'Se ci sono sintomi fisici persistenti, coinvolgi anche il tuo medico', 'Nel frattempo riduci dove puoi: ogni margine recuperato conta'] }
        ];
        var band = bands.find(function (b) { return tot <= b.max; });
        var pct = Math.round(tot / 24 * 100);
        var html =
          '<div class="max-w-lg mx-auto">' +
            '<div class="flex h-3 rounded-full overflow-hidden" aria-hidden="true"><div class="w-1/4 bg-emerald-400"></div><div class="w-1/4 bg-amber-400"></div><div class="w-1/4 bg-orange-400"></div><div class="w-1/4 bg-red-400"></div></div>' +
            '<div class="text-notte text-sm leading-none mt-0.5" aria-hidden="true" style="margin-left:max(0%, calc(' + pct + '% - 7px))">▲</div>' +
            '<p class="text-center font-semibold text-notte mt-2">Punteggio: ' + tot + ' su 24 · <span class="' + band.colore + ' px-2.5 py-0.5 rounded-full text-sm">' + band.nome + '</span></p>' +
          '</div>' +
          '<p class="text-center max-w-xl mx-auto mt-5">' + band.testo + '</p>' +
          '<div class="bg-crema rounded-2xl p-5 mt-6 max-w-xl mx-auto"><p class="font-semibold text-notte mb-2.5">Da dove partire</p><ul class="space-y-2 text-sm">' +
            band.tips.map(function (t) { return '<li class="flex gap-2"><span class="text-salvia-600 font-bold" aria-hidden="true">→</span><span>' + t + '</span></li>'; }).join('') +
          '</ul></div>';
        return { kicker: 'Il tuo carico lavorativo', title: band.nome, code: 'PUNTEGGIO ' + tot + ' / 24', html: html,
          share: 'ho totalizzato ' + tot + ' punti su 24 ("' + band.nome + '")',
          report: {
            kind: 'punteggio',
            testName: 'Quanto ti sta costando il lavoro?',
            intro: 'Misura del carico e dei segnali di logorio',
            title: band.nome,
            code: 'Punteggio ' + tot + ' / 24',
            score: tot, max: 24, pct: pct,
            description: band.testo,
            lists: [{ heading: 'Da dove partire', items: band.tips }],
            gauge: pct
          }
        };
      }
    },

    domanda: {
      nome: 'test "Cosa stai chiedendo, davvero?"',
      chip: 'Analisi della Domanda',
      questions: [
        { text: 'Se il malessere di questo periodo potesse parlare, di cosa parlerebbe soprattutto?', options: [
          { label: 'Di un rapporto: qualcuno che manca, che pesa o che non mi vede', add: { REL: 1 } },
          { label: 'Del lavoro: fatica, insoddisfazione o senso di ingiustizia', add: { LAV: 1 } },
          { label: 'Di me: di come mi tratto e di quanto poco mi riconosco', add: { SE: 1 } },
          { label: 'Di una vita che non sento più mia: qualcosa deve cambiare', add: { DIR: 1 } }
        ]},
        { text: 'Cosa ti capita di invidiare — sanamente — negli altri?', options: [
          { label: 'I legami: chi ha relazioni calde e sincere', add: { REL: 1 } },
          { label: 'La strada: chi fa un lavoro che lo appassiona', add: { LAV: 1 } },
          { label: 'La pace: chi sembra stare bene con se stesso', add: { SE: 1 } },
          { label: 'Il coraggio: chi ha cambiato vita davvero', add: { DIR: 1 } }
        ]},
        { text: 'Nei momenti vuoti, il pensiero torna più spesso…', options: [
          { label: 'A una relazione: qualcosa da chiarire, dire o perdonare', add: { REL: 1 } },
          { label: 'Alle cose di lavoro, anche quando vorrei staccare', add: { LAV: 1 } },
          { label: 'A come mi sento: un dialogo interno che non si spegne', add: { SE: 1 } },
          { label: 'A un altrove: "e se mollassi tutto? e se vivessi diversamente?"', add: { DIR: 1 } }
        ]},
        { text: 'Se tra un anno andasse tutto bene, la differenza più grande sarebbe…', options: [
          { label: 'Relazioni più vere: sentirmi visto e capito da chi conta', add: { REL: 1 } },
          { label: 'Un lavoro sostenibile, che mi somiglia e mi riconosce', add: { LAV: 1 } },
          { label: 'Più pace con me stesso: meno giudice interno, più fiducia', add: { SE: 1 } },
          { label: 'Una direzione chiara: sapere dove sto andando, e perché', add: { DIR: 1 } }
        ]},
        { text: 'La frase che oggi senti più tua:', options: [
          { label: '"Mi sento solo, anche in mezzo agli altri"', add: { REL: 1 } },
          { label: '"Sono stanco di correre senza sentirmi mai a posto"', add: { LAV: 1 } },
          { label: '"Non mi riconosco più"', add: { SE: 1 } },
          { label: '"Mi sento fermo, in attesa di qualcosa che non arriva"', add: { DIR: 1 } }
        ]}
      ],
      result: function (s) {
        var aree = [
          { k: 'REL', nome: 'Legami e relazioni',
            desc: 'Le tue risposte convergono sull\'area delle relazioni: c\'è un legame — o la sua mancanza — che sta chiedendo attenzione. Spesso il malessere che sembra "nostro" nasce in realtà dentro un rapporto: qualcosa di non detto, un riconoscimento che non arriva, una distanza che si è allargata in silenzio.',
            terapia: 'In un percorso lavoreremmo sul modo in cui stai dentro i tuoi legami: cosa chiedi, cosa non osi chiedere, e quali copioni si ripetono da più tempo di quanto immagini.' },
          { k: 'LAV', nome: 'Lavoro e realizzazione',
            desc: 'Le tue risposte convergono sull\'area del lavoro e della realizzazione: la fatica che senti non è solo una questione di carico, ma di significato — il bisogno che ciò che fai ti somigli e ti restituisca qualcosa, oltre lo stipendio.',
            terapia: 'In un percorso esploreremmo cosa stai davvero chiedendo al tuo lavoro — riconoscimento, sicurezza, identità? — e cosa di quel bisogno può trovare risposta lì, o altrove.' },
          { k: 'SE', nome: 'Identità e rapporto con te stesso',
            desc: 'Le tue risposte convergono sull\'area del rapporto con te stesso: il dialogo interno, il giudice severo, la sensazione di non riconoscersi più. È la domanda più silenziosa e più profonda: prima ancora di cambiare qualcosa fuori, chiede di rimettere ordine dentro.',
            terapia: 'In un percorso daremmo spazio a quella voce interna: da dove viene, chi l\'ha messa lì, e come costruire un modo più giusto — e più tuo — di guardarti.' },
          { k: 'DIR', nome: 'Direzione e cambiamento',
            desc: 'Le tue risposte convergono sull\'area della direzione: la sensazione di essere fermi, in attesa, o dentro una vita che non senti più tua. È una domanda potente, perché il desiderio di cambiamento è già una bussola — anche quando non sai ancora dove punta.',
            terapia: 'In un percorso trasformeremmo quell\'inquietudine in informazione: cosa sta finendo, cosa vuole nascere, e quali paure tengono ferma una scelta che dentro di te forse è già presa.' }
        ];
        var ordinate = aree.slice().sort(function (a, b) { return (s[b.k] || 0) - (s[a.k] || 0); });
        var top = ordinate[0];
        var bars = aree.map(function (a) {
          var v = s[a.k] || 0;
          var pct = Math.round(v / 5 * 100);
          return '<div class="mb-2.5"><div class="flex justify-between text-xs font-semibold text-inchiostro/60 mb-1"><span>' + a.nome + '</span><span>' + v + '/5</span></div>' +
            '<div class="h-2.5 bg-tortora rounded-full overflow-hidden"><div class="h-full ' + (a.k === top.k ? 'bg-salvia-600' : 'bg-tortora-dark') + ' rounded-full" style="width:' + Math.max(pct, 4) + '%"></div></div></div>';
        }).join('');
        var html =
          '<p class="text-center max-w-xl mx-auto">' + top.desc + '</p>' +
          '<div class="bg-salvia-50 rounded-2xl p-5 mt-6 max-w-xl mx-auto"><p class="font-semibold text-notte mb-2">Come lavoreremmo insieme</p><p class="text-sm">' + top.terapia + '</p></div>' +
          '<div class="mt-7 max-w-xl mx-auto"><p class="font-semibold text-notte mb-3">La mappa delle tue aree</p>' + bars + '</div>';
        return { kicker: 'La tua domanda', title: top.nome, code: 'L\'AREA CHE CHIEDE ATTENZIONE', html: html,
          share: 'come area principale è emersa: ' + top.nome.toLowerCase(),
          report: {
            kind: 'area',
            testName: 'Cosa stai chiedendo, davvero?',
            intro: 'Mappa ispirata all\'Analisi della Domanda',
            title: top.nome,
            code: 'L\'area che chiede attenzione',
            description: top.desc,
            lists: [{ heading: 'Come lavoreremmo insieme', items: [top.terapia] }],
            areaBars: aree.map(function (a) {
              return { name: a.nome, value: s[a.k] || 0, max: 5, isTop: a.k === top.k };
            })
          }
        };
      }
    }
  };

  /* ---------- Funzioni pure di supporto ---------- */

  // Valida un indirizzo email in modo semplice ma robusto.
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  // Somma i punteggi di un test dato l'elenco degli indici scelti.
  function scoreAnswers(testId, answerIndices) {
    var t = TESTS[testId];
    if (!t) { throw new Error('Test sconosciuto: ' + testId); }
    var scores = {};
    answerIndices.forEach(function (optIndex, qi) {
      var question = t.questions[qi];
      if (!question || !question.options[optIndex]) {
        throw new Error('Risposta non valida alla domanda ' + qi + ' del test ' + testId);
      }
      var add = question.options[optIndex].add;
      Object.keys(add).forEach(function (k) { scores[k] = (scores[k] || 0) + add[k]; });
    });
    return scores;
  }

  // Punteggia e calcola il risultato completo in un colpo solo.
  function evaluate(testId, answerIndices) {
    var scores = scoreAnswers(testId, answerIndices);
    return { scores: scores, result: TESTS[testId].result(scores) };
  }

  // Compone il corpo dell'email/WhatsApp a partire dai campi del form.
  // Funzione pura: riceve un oggetto, restituisce una stringa.
  function buildEmailBody(d) {
    d = d || {};
    var nome = (d.nome || '').trim();
    var email = (d.email || '').trim();
    var telefono = (d.telefono || '').trim();
    var setting = d.setting || '';
    var messaggio = (d.messaggio || '').trim();
    var temi = Array.isArray(d.temi) ? d.temi : [];

    var body = 'Richiesta di primo colloquio dal sito\n';
    body += '--------------------------------------\n';
    body += 'Nome: ' + nome + '\n';
    body += 'Email: ' + email + '\n';
    if (telefono) { body += 'Telefono: ' + telefono + '\n'; }
    body += 'Preferenza setting: ' + setting + '\n';
    if (temi.length) { body += 'Temi indicati: ' + temi.join(', ') + '\n'; }
    body += '--------------------------------------\n\n';
    if (messaggio) { body += messaggio + '\n'; }
    return body;
  }

  return {
    LIKERT: LIKERT,
    jungProfiles: jungProfiles,
    axisBar: axisBar,
    TESTS: TESTS,
    isValidEmail: isValidEmail,
    scoreAnswers: scoreAnswers,
    evaluate: evaluate,
    buildEmailBody: buildEmailBody
  };
});
