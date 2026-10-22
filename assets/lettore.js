/* ============================================================
   lettore.js — la finestra di lettura del sito
   ------------------------------------------------------------
   Articoli brevi, case study del portfolio ed estratti dei compendi si
   aprono in una finestra sopra la pagina. Prima tutto questo viveva
   dentro lo script della home, e quindi esisteva solo lì: quando le
   sezioni per i colleghi si sono spostate su /colleghi/, i loro pulsanti
   «Leggi» non avrebbero aperto più niente.

   Ora il lettore è un file solo, caricato dalla home e dalle pagine che
   lo dichiarano nei metadati ("script": ["lettore.js"]). Se la pagina
   non contiene già la finestra, la aggiunge lui.

   Contiene anche il filtro dei compendi per lingua (data-langs), che
   segue le schede ovunque si trovino.
   ============================================================ */
(function () {
  'use strict';

  var MARKUP = `
<div id="article-modal" class="fixed inset-0 z-[80] hidden overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="article-modal-title">
    <div id="article-overlay" class="fixed inset-0 bg-notte-deep/70 backdrop-blur-sm" aria-hidden="true"></div>
    <div class="relative min-h-full flex items-start justify-center p-4 sm:p-8">
      <article class="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-6 p-7 sm:p-12">
        <button id="article-close" class="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-crema hover:bg-tortora transition-colors" aria-label="Chiudi l'articolo">
          <i data-lucide="x" class="w-5 h-5" aria-hidden="true"></i>
        </button>
        <p id="article-modal-kicker" class="text-xs font-semibold uppercase tracking-[0.2em] text-mirtillo-700 mb-3 pr-12"></p>
        <h3 id="article-modal-title" class="font-serif text-2xl sm:text-3xl text-notte leading-tight mb-6 pr-12"></h3>
        <div id="article-modal-body" class="space-y-4 text-[1.02rem] text-inchiostro/85 leading-relaxed"></div>
        <div class="mt-9 bg-mirtillo-50 rounded-2xl p-6 text-center">
          <p id="article-cta-text" class="font-medium text-notte mb-4">Ti sei riconosciuto in queste righe? Possiamo partire da qui.</p>
          <button type="button" id="article-cta" class="inline-flex items-center gap-2 bg-mirtillo-700 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-mirtillo-600 transition-colors">
            <i id="article-cta-icon" data-lucide="calendar-heart" class="w-5 h-5" aria-hidden="true"></i> <span id="article-cta-label">Prenota un primo colloquio</span>
          </button>
        </div>
      </article>
    </div>
  </div>
`;

  function disegnaIcone() {
    if (window.lucide) { window.lucide.createIcons(); }
  }

  function init() {
    if (!document.getElementById('article-modal')) {
      document.body.insertAdjacentHTML('beforeend', MARKUP);
      disegnaIcone();
    }

    /* ============================================================
       ARTICOLI — lettore modale
       ============================================================ */
    const articles = {
      'comp-adhd-trauma-it': {
        kicker: 'Estratto gratuito · Compendio per terapeuti',
        title: 'ADHD e trauma relazionale: una lettura psicodinamica',
        buyHref: 'https://psicovoice.gumroad.com/l/adhd_trauma_relazionale',
        ctaText: 'Questo è l\'inizio della premessa. Il compendio completo raccoglie quattordici capitoli e un\'appendice operativa con una griglia d\'osservazione.',
        ctaLabel: 'Acquista il compendio su Gumroad',
        body: [
          'Va detto subito, perché inquadra tutto il resto, che la questione che ci interessa non è se l\'ADHD esista, ma che cosa facciamo noi, in stanza, di una persona che arriva con quella parola già scritta sulla propria fronte. Il dibattito pubblico si è polarizzato attorno all\'esistenza della diagnosi, come se il compito clinico fosse schierarsi; il compito clinico, invece, comincia dopo, quando abbiamo davanti una storia singolare che nessuna categoria esaurisce.',
          'Da questo punto di vista la svolta recente sui punti di forza dell\'ADHD adulto è insieme un buon segnale e un\'occasione mancata. È un buon segnale perché rompe la grammatica del difetto, ed è un\'occasione mancata perché lo fa restando dentro la stessa cornice che intendeva correggere, così che sposta il segno da meno a più senza spostare il piano del discorso.',
          'La domanda psicodinamica, che è poi la nostra domanda di mestiere, non chiede «quale deficit» e neppure «quale talento», ma a che cosa serva questo modo di stare al mondo, da quando, e dentro quali relazioni si sia formato.',
          'Questo compendio non propone una teoria alternativa all\'ADHD e non intende sostituire una diagnosi con un\'altra, perché sostituire «ADHD» con «trauma» sarebbe soltanto cambiare etichetta. Propone invece di tenere aperta la tensione tra una determinazione neurobiologica reale e una storia relazionale altrettanto reale, che non si lascia ridurre né alla sola genetica né al solo trauma.',
          'Fine dell\'estratto.',
          'Nel compendio completo ci sono quattordici capitoli sul dibattito teorico, sulla formazione dei sistemi di regolazione, sulla diagnosi differenziale con il trauma complesso e su transfert e controtransfert, oltre a un\'appendice operativa con una griglia d\'osservazione che serve a organizzare l\'ascolto, non a classificare le persone.'
        ],
        en: {
          kicker: 'Free excerpt · Compendium for therapists',
          title: 'ADHD and relational trauma: a psychodynamic reading',
          buyHref: 'https://psicovoice.gumroad.com/l/adhd_trauma_relazionale',
          ctaText: 'This is the opening of the preface: the full compendium gathers fourteen chapters and an operational appendix. (Italian edition; an English volume is also available.)',
          ctaLabel: 'Buy the compendium on Gumroad',
          body: [
            'It should be said at once, because it frames everything else: the question that concerns us is not whether ADHD exists, but what we do (in the consulting room) with a person who arrives with that word already written on their forehead. Public debate has polarised around the existence of the diagnosis, as if the clinical task were to take sides; the clinical task begins afterwards, when we have in front of us a singular history that no category exhausts.',
            'The recent strengths-based turn on adult ADHD is, from this point of view, both a good sign and a missed opportunity. A good sign, because it breaks the grammar of deficit. A missed opportunity, because it does so from inside the very frame it meant to correct: it moves the sign from minus to plus, but it does not move the plane of the discussion.',
            'The psychodynamic question, which is the question of our craft, is neither "which deficit" nor "which talent," but: what is this way of being in the world for? Since when? With whom?',
            'This compendium does not propose an alternative theory of ADHD, and it does not mean to replace one diagnosis with another, replacing "ADHD" with "trauma" would only be changing the label. It proposes instead to hold a tension open: between a real neurobiological determination and an equally real relational history. It is neither only genetics nor only trauma.',
            'End of excerpt.',
            'The full compendium (in Italian) covers: fourteen chapters on the theoretical debate, on how regulatory systems are formed, on differential diagnosis with complex trauma, on transference and countertransference, and an operational appendix with an observation grid meant to organise listening, not to classify people.'
          ]
        },
        es: {
          kicker: 'Extracto gratuito · Compendio para terapeutas',
          title: 'TDAH y trauma relacional: una lectura psicodinámica',
          buyHref: 'https://psicovoice.gumroad.com/l/adhd_trauma_relazionale',
          ctaText: 'Este es el comienzo del prólogo: el compendio completo reúne catorce capítulos y un apéndice operativo. (Edición en italiano; existe también un volumen en inglés.)',
          ctaLabel: 'Compra el compendio en Gumroad',
          body: [
            'Conviene decirlo de entrada, porque enmarca todo lo demás: la cuestión que nos interesa no es si el TDAH existe, sino qué hacemos (nosotros, en la consulta) con una persona que llega con esa palabra ya escrita en la frente. El debate público se ha polarizado en torno a la existencia del diagnóstico, como si la tarea clínica fuera tomar partido; la tarea clínica, en cambio, empieza después, cuando tenemos delante una historia singular que ninguna categoría agota.',
            'El reciente giro hacia los puntos fuertes del TDAH adulto es, desde este punto de vista, una buena señal y una oportunidad perdida a la vez. Buena señal, porque rompe la gramática del defecto. Oportunidad perdida, porque lo hace quedándose dentro del mismo marco que pretendía corregir: cambia el signo de menos a más, pero no cambia el plano del discurso.',
            'La pregunta psicodinámica, que es la pregunta de nuestro oficio, no es «qué déficit» ni tampoco «qué talento», sino: ¿para qué sirve esta manera de estar en el mundo? ¿Desde cuándo? ¿Con quién?',
            'Este compendio no propone una teoría alternativa al TDAH ni pretende sustituir un diagnóstico por otro, sustituir «TDAH» por «trauma» sería solo cambiar de etiqueta. Propone en cambio mantener abierta una tensión: la que hay entre una determinación neurobiológica real y una historia relacional igualmente real. No es solo genética ni solo trauma.',
            'Fin del extracto.',
            'El compendio completo (en italiano) incluye: catorce capítulos sobre el debate teórico, sobre cómo se forman los sistemas de regulación, sobre el diagnóstico diferencial con el trauma complejo, sobre transferencia y contratransferencia, y un apéndice operativo con una guía de observación que sirve para organizar la escucha, no para clasificar a las personas.'
          ]
        }
      },
      'comp-piu-della-diagnosi': {
        kicker: 'Estratto gratuito · Guida per chi convive con l\'ADHD',
        title: 'Più della diagnosi: ADHD, la tua storia e chi sei',
        buyHref: 'https://psicovoice.gumroad.com/l/ADHD_la_tua_storia',
        ctaText: 'La guida completa prosegue con la tua storia, con quello che la ricerca sa e non sa ancora, e con come parlarne a un professionista.',
        ctaLabel: 'Acquista la guida su Gumroad',
        body: [
          'C\'è una frase che quasi tutte le persone con ADHD hanno sentito, spesso da bambini e poi di nuovo da adulti, in versioni diverse ma con lo stesso fondo, ed è «se solo ti impegnassi un po\' di più». A volte viene detta con affetto e a volte con esasperazione, quasi sempre da qualcuno che non aveva cattive intenzioni e semplicemente non capiva che cosa stesse guardando.',
          'Il problema di quella frase non sta nella scortesia, ma nel fatto che è sbagliata proprio nel punto in cui conta, perché quel po\' di più tu lo stai già mettendo. Lo metti quando rileggi la stessa mail quattro volte per essere sicuro di non aver saltato una riga, e lo metti quando arrivi con venticinque minuti di anticipo perché l\'unico modo che hai trovato per non arrivare tardi è partire assurdamente presto.',
          'Vale la pena chiarire anche l\'altra parola, quella che forse ti sei detto in silenzio più di una volta, cioè «rotto». Non lo sei. Una mente con ADHD non è una mente difettosa da riparare perché torni normale, ma una mente che distribuisce le sue risorse in modo diverso, con dei costi veri che non ha senso minimizzare e con delle capacità che di solito nessuno ti ha mai fatto notare.',
          'Nulla di quello che leggerai qui è una diagnosi, e niente in queste pagine può dirti se hai l\'ADHD oppure no. Se ti riconosci in quello che trovi, la strada non è convincerti da solo ma parlarne con un professionista qualificato, che ha gli strumenti e il tempo per guardare la tua storia intera.',
          'Fine dell\'estratto.',
          'Nella guida completa trovi che cosa sappiamo e che cosa ancora non sappiamo sull\'ADHD, perché la tua attenzione ha una storia oltre che una diagnosi, come l\'etichetta può liberarti all\'inizio e ingabbiarti dopo e come arrivare preparato al confronto con un professionista, con sei illustrazioni a matita dell\'autore.'
        ],
        en: {
          kicker: 'Free excerpt · Guide for people living with ADHD',
          title: 'More than the diagnosis: ADHD, your history and who you are',
          buyHref: 'https://psicovoice.gumroad.com/l/ADHD_la_tua_storia',
          ctaText: 'The full guide goes on with your history, with what research does and does not yet know, and with how to talk about it with a professional. (Italian edition.)',
          ctaLabel: 'Buy the guide on Gumroad',
          body: [
            'There is a sentence almost every person with ADHD has heard, often as a child and then again as an adult, in different versions but always with the same bottom: if only you tried a little harder. Sometimes said with affection. Sometimes with exasperation. Almost always by someone who meant no harm and simply did not understand what they were looking at.',
            'The problem with that sentence is not that it is unkind. It is that it is wrong exactly where it matters. Because you are already putting in that little bit more. You put it in when you reread the same email four times to be sure you have not skipped a line. You put it in when you arrive twenty-five minutes early because the only way you have found not to be late is to leave absurdly early.',
            'Let us also be clear about the other word, the one you have perhaps said to yourself in silence more than once: broken. You are not. A mind with ADHD is not a faulty mind that should be repaired to become normal again. It is a mind that distributes its resources differently, with real costs, which there is no point in minimising, and with capacities that usually nobody has ever pointed out to you.',
            'Nothing you read here is a diagnosis, and nothing in these pages can tell you whether you have ADHD or not. If you recognise yourself in what you find, the way forward is not to convince yourself on your own: it is to talk about it with a qualified professional who has the tools and the time to look at your whole history.',
            'End of excerpt.',
            'The full guide (in Italian) covers: what we know and what we still do not know about ADHD, why your attention has a history as well as a diagnosis, how a label can free you at first and cage you later, and how to come prepared to a conversation with a professional. With six pencil illustrations by the author.'
          ]
        },
        es: {
          kicker: 'Extracto gratuito · Guía para quien convive con el TDAH',
          title: 'Más que el diagnóstico: TDAH, tu historia y quién eres',
          buyHref: 'https://psicovoice.gumroad.com/l/ADHD_la_tua_storia',
          ctaText: 'La guía completa sigue con tu historia, con lo que la investigación sabe y todavía no sabe, y con cómo hablarlo con un profesional. (Edición en italiano.)',
          ctaLabel: 'Compra la guía en Gumroad',
          body: [
            'Hay una frase que casi todas las personas con TDAH han escuchado, a menudo de niñas y luego otra vez de adultas, en versiones distintas pero siempre con el mismo fondo: si te esforzaras un poco más. A veces dicha con afecto. A veces con exasperación. Casi siempre por alguien que no tenía malas intenciones y simplemente no entendía qué estaba mirando.',
            'El problema de esa frase no es que sea descortés. Es que se equivoca justo donde importa. Porque tú ya estás poniendo ese poco más. Lo pones cuando relees el mismo correo cuatro veces para asegurarte de no haberte saltado una línea. Lo pones cuando llegas veinticinco minutos antes porque la única manera que has encontrado de no llegar tarde es salir absurdamente pronto.',
            'Aclaremos también la otra palabra, la que quizás te has dicho en silencio más de una vez: roto. No lo estás. Una mente con TDAH no es una mente defectuosa que habría que reparar para volver a ser normal. Es una mente que distribuye sus recursos de otra manera, con costes reales, que no tiene sentido minimizar, y con capacidades que normalmente nadie te ha hecho notar.',
            'Nada de lo que leerás aquí es un diagnóstico, y nada en estas páginas puede decirte si tienes TDAH o no. Si te reconoces en lo que encuentras, el camino no es convencerte por tu cuenta: es hablarlo con un profesional cualificado, que tiene las herramientas y el tiempo para mirar tu historia entera.',
            'Fin del extracto.',
            'La guía completa (en italiano) incluye: qué sabemos y qué todavía no sabemos sobre el TDAH, por qué tu atención tiene una historia además de un diagnóstico, cómo la etiqueta puede liberarte al principio y encerrarte después, y cómo llegar preparado a la conversación con un profesional. Con seis ilustraciones a lápiz del autor.'
          ]
        }
      },
      'comp-adhd-trauma-en': {
        kicker: 'Estratto gratuito · Compendio in inglese',
        title: 'ADHD and Relational Trauma: A Psychodynamic Reading',
        buyHref: 'https://psicovoice.gumroad.com/l/ADHD_Relational_Trauma',
        ctaText: 'È un volume autonomo in inglese, non una traduzione dell\'edizione italiana, con quattordici capitoli e un\'appendice operativa con griglia d\'osservazione.',
        ctaLabel: 'Acquista il compendio (EN) su Gumroad',
        body: [
          'Questo è l\'estratto del volume inglese, pensato per i colleghi che lavorano in lingua inglese. Non è una traduzione dell\'edizione italiana ma un testo autonomo, e qui sotto ne trovi l\'anteprima nella lingua originale.',
          'One thing must be stated at the outset, because it frames everything that follows: this compendium does not set out to dispute the diagnosis of ADHD, nor to replace it with trauma. It sets out to do something narrower and, we think, more useful, namely to ask what happens in the consulting room when the map we have been handed does not cover the whole territory of the person sitting in front of us.',
          'The strengths-based turn, for all its usefulness, remains almost entirely inside a neurobiological frame. It changes the sign in front of the terms (from minus to plus) while leaving the grammar untouched. We are told that the trait is adaptive in certain environments. We are rarely told which environments the person actually grew up in, and what that environment required of their attention.',
          'When a forty-year-old woman tells us she cannot read three pages of a novel without her mind going elsewhere, the neurocognitive question is what is failing in sustained attention. The psychodynamic question is different: what is her attention doing instead, and what was it trained to do? If it goes toward the tone of a voice in the next room, toward a scan of who might be about to need something from her, then we are not looking at attention that has failed. We are looking at attention doing exactly what it learned to do.',
          'End of excerpt.',
          'The full compendium covers: fourteen chapters on the theoretical debate, on how regulatory systems are shaped by early relational experience, on differential diagnosis with complex trauma, on transference and countertransference, and an operational appendix with an observation grid meant to organise listening, not to classify people.'
        ],
        en: {
          kicker: 'Free excerpt · Compendium for clinicians',
          title: 'ADHD and Relational Trauma: A Psychodynamic Reading',
          buyHref: 'https://psicovoice.gumroad.com/l/ADHD_Relational_Trauma',
          ctaText: 'A standalone English volume, not a translation of the Italian edition: fourteen chapters and an operational appendix with an observation grid.',
          ctaLabel: 'Buy the compendium on Gumroad',
          body: [
            'One thing must be stated at the outset, because it frames everything that follows: this compendium does not set out to dispute the diagnosis of ADHD, nor to replace it with trauma. It sets out to do something narrower and, we think, more useful, namely to ask what happens in the consulting room when the map we have been handed does not cover the whole territory of the person sitting in front of us.',
            'The research on adult ADHD has begun to move away from a purely deficit-based description toward a strengths-based reading. This is a real advance, and it is worth saying so clearly rather than grudgingly: a person described only through their deficits eventually starts describing themselves that way too. And yet the strengths-based turn remains almost entirely inside a neurobiological frame. It changes the sign in front of the terms (from minus to plus) while leaving the grammar untouched.',
            'When a forty-year-old woman tells us she cannot read three pages of a novel without her mind going elsewhere, the neurocognitive question is what is failing in sustained attention, and it is a legitimate question. The psychodynamic question is different: what is her attention doing instead, and what was it trained to do? If it goes toward the sound of footsteps in the corridor, toward the tone of a voice in the next room, toward a scan of who might be about to need something from her, then we are not looking at attention that has failed. We are looking at attention that is doing exactly what it learned to do, in a house where knowing the mood of the adults before they entered the room was the difference between a calm evening and a bad one.',
            'Two things must be held together here, and the whole compendium is an attempt to hold them: that constitutional and neurobiological factors in attentional regulation are real and not dissolvable into biography, and that early relational experience shapes the developing regulatory systems in ways that are equally real. It is neither only genetics nor only trauma.',
            'End of excerpt.',
            'The full compendium covers: fourteen chapters on the theoretical debate, on how regulatory systems are shaped by early relational experience, on differential diagnosis with complex trauma, on transference and countertransference, and an operational appendix with an observation grid meant to organise listening, not to classify people.'
          ]
        },
        es: {
          kicker: 'Extracto gratuito · Compendio en inglés',
          title: 'TDAH y trauma relacional: una lectura psicodinámica (EN)',
          buyHref: 'https://psicovoice.gumroad.com/l/ADHD_Relational_Trauma',
          ctaText: 'Volumen autónomo en inglés, no una traducción de la edición italiana: catorce capítulos y un apéndice operativo con guía de observación.',
          ctaLabel: 'Compra el compendio (EN) en Gumroad',
          body: [
            'Este es el extracto del volumen en inglés, pensado para colegas que trabajan en lengua inglesa. No es una traducción de la edición italiana: es un texto autónomo. A continuación encontrarás la vista previa en el idioma original (inglés).',
            'One thing must be stated at the outset, because it frames everything that follows: this compendium does not set out to dispute the diagnosis of ADHD, nor to replace it with trauma. It sets out to ask what happens in the consulting room when the map we have been handed does not cover the whole territory of the person sitting in front of us.',
            'The strengths-based turn, for all its usefulness, remains almost entirely inside a neurobiological frame. It changes the sign in front of the terms (from minus to plus) while leaving the grammar untouched. We are rarely told which environments the person actually grew up in, and what that environment required of their attention.',
            'The psychodynamic question is different: what is her attention doing instead, and what was it trained to do? If it goes toward the tone of a voice in the next room, toward a scan of who might be about to need something from her, then we are looking at attention that is doing exactly what it learned to do.',
            'End of excerpt.',
            'The full compendium covers: fourteen chapters on the theoretical debate, on how regulatory systems are shaped by early relational experience, on differential diagnosis with complex trauma, on transference and countertransference, and an operational appendix with an observation grid.'
          ]
        }
      },
      'comp-adhd-clinici': {
        kicker: 'Estratto gratuito · Compendio per terapeuti',
        title: 'ADHD adulto: uno sguardo psicodinamico',
        buyHref: 'https://psicovoice.gumroad.com/l/adhd-psicodinamico',
        ctaText: 'Qui c\'è solo l\'inizio; il compendio completo raccoglie tutti i capitoli, dalla teoria al materiale clinico.',
        ctaLabel: 'Acquista il compendio su Gumroad',
        body: [
          'Questo compendio nasce dalla convinzione che sull\'ADHD in età adulta lo sguardo psicodinamico abbia ancora qualcosa da dire, e che dirlo non significhi opporsi al dato neurobiologico, ma abitare lo spazio che quel dato lascia scoperto.',
          'La letteratura corrente sull\'ADHD adulto è in larghissima parte neurobiologica e cognitivo-comportamentale, ed è una conoscenza preziosa che questo testo non contesta. Eppure il clinico che lavora in chiave psicodinamica incontra, nella stanza, qualcosa che quelle mappe non esauriscono, cioè un modo di stare in relazione, una storia dell\'attenzione e della sua interruzione, un significato che il sintomo porta con sé.',
          'Il paziente adulto con ADHD non arriva quasi mai portando «un deficit»; arriva portando una vita fatta di relazioni che si interrompono, progetti abbandonati sul più bello e un senso cronico di non essere all\'altezza. È lì che comincia il nostro compito, che non consiste nel confermare o smentire la diagnosi ma nel restituire alla persona la possibilità di pensarsi.',
          'Fine dell\'estratto.',
          'Nel compendio completo ci sono il dibattito teorico, la funzione psichica in gioco, il quadro clinico riletto in seduta, la diagnosi differenziale, transfert e controtransfert, le scelte tecniche, il lavoro sul coping, il rapporto con il farmaco e il materiale clinico.'
        ],
        en: {
          kicker: 'Free excerpt · Compendium for therapists',
          title: 'Adult ADHD: a psychodynamic reading',
          buyHref: 'https://psicovoice.gumroad.com/l/adhd-psicodinamico',
          ctaText: 'This is only the opening: the full compendium gathers every chapter, from theory to clinical material. (Italian edition.)',
          ctaLabel: 'Buy the compendium on Gumroad',
          body: [
            'This compendium grows from a simple conviction: that on adult ADHD the psychodynamic gaze still has something to say, and that saying it does not mean opposing the neurobiological evidence, but inhabiting the space that evidence leaves uncovered.',
            'The current literature on adult ADHD is overwhelmingly neurobiological and cognitive-behavioural. It is valuable knowledge, and this text does not contest it. But the clinician who works psychodynamically meets, in the consulting room, something those maps do not exhaust: a way of being in relationship, a history of attention and its interruption, a meaning the symptom carries.',
            'The adult patient with ADHD almost never arrives carrying "a deficit." They arrive carrying a life: relationships that break off, projects abandoned at the crucial moment, a chronic sense of not measuring up. Our task begins there: not in confirming or refuting the diagnosis, but in restoring to the person the possibility of thinking about themselves.',
            'End of excerpt.',
            'The full compendium (in Italian) covers: the theoretical debate, the psychic function at stake, the clinical picture re-read in session, differential diagnosis, transference and countertransference, technical choices, the work on coping, the relationship with medication, and clinical material.'
          ]
        },
        es: {
          kicker: 'Extracto gratuito · Compendio para terapeutas',
          title: 'TDAH adulto: una mirada psicodinámica',
          buyHref: 'https://psicovoice.gumroad.com/l/adhd-psicodinamico',
          ctaText: 'Esto es solo el comienzo: el compendio completo reúne todos los capítulos, de la teoría al material clínico. (Edición en italiano.)',
          ctaLabel: 'Compra el compendio en Gumroad',
          body: [
            'Este compendio nace de una convicción simple: que sobre el TDAH en la edad adulta la mirada psicodinámica todavía tiene algo que decir, y que decirlo no significa oponerse al dato neurobiológico, sino habitar el espacio que ese dato deja descubierto.',
            'La literatura actual sobre el TDAH adulto es, en gran parte, neurobiológica y cognitivo-conductual. Es un conocimiento valioso, que este texto no cuestiona. Pero el clínico que trabaja en clave psicodinámica encuentra, en la consulta, algo que esos mapas no agotan: un modo de estar en relación, una historia de la atención y de su interrupción, un significado que el síntoma trae consigo.',
            'El paciente adulto con TDAH casi nunca llega trayendo «un déficit». Llega trayendo una vida: relaciones que se interrumpen, proyectos abandonados en el mejor momento, una sensación crónica de no estar a la altura. Nuestra tarea empieza ahí: no en confirmar o desmentir el diagnóstico, sino en devolver a la persona la posibilidad de pensarse.',
            'Fin del extracto.',
            'El compendio completo (en italiano) incluye: el debate teórico, la función psíquica en juego, el cuadro clínico releído en sesión, el diagnóstico diferencial, transferencia y contratransferencia, las decisiones técnicas, el trabajo sobre el afrontamiento, la relación con el fármaco y el material clínico.'
          ]
        }
      },
      'comp-adhd-pazienti': {
        kicker: 'Estratto gratuito · Guida per pazienti',
        title: 'ADHD da adulto: una guida per capirti',
        buyHref: 'https://psicovoice.gumroad.com/l/adhd-da-adulto-guida',
        ctaText: 'La guida completa continua con le strategie che stanno dalla tua parte e con come chiedere aiuto quando serve.',
        ctaLabel: 'Acquista la guida su Gumroad',
        body: [
          'Se hai aperto questa guida, forse è perché una parola, ADHD, ha cominciato a girarti in testa. Magari hai ricevuto una diagnosi da poco, magari te lo stai ancora chiedendo; in ogni caso probabilmente porti con te una lunga storia di cose lasciate a metà e la sensazione di non essere all\'altezza.',
          'Voglio dirti subito una cosa, e vorrei che la leggessi piano. Non sei pigro, e non sei rotto. La tua mente funziona in un modo, e quel modo ha una storia, un senso, e anche dei punti di forza che magari non hai mai imparato a vedere.',
          'Questa guida serve a darti parole chiare per capirti, storie in cui riconoscerti e qualche strategia che non cerca di «aggiustarti» ma di stare dalla tua parte. Non è un manuale e non è una terapia; somiglia di più a una lunga chiacchierata con qualcuno che prova a spiegarti come funzioni, con rispetto e senza fretta.',
          'Fine dell\'estratto.',
          'Nella guida completa trovi come funziona la tua attenzione, perché a volte il caos ha un senso, quali strategie stanno dalla tua parte, e come e quando chiedere aiuto a un professionista.'
        ],
        en: {
          kicker: 'Free excerpt · Guide for patients',
          title: 'Adult ADHD: a guide to understanding yourself',
          buyHref: 'https://psicovoice.gumroad.com/l/adhd-da-adulto-guida',
          ctaText: 'The full guide continues with the strategies that are on your side, and with how to ask for help when you need it. (Italian edition.)',
          ctaLabel: 'Buy the guide on Gumroad',
          body: [
            'If you have opened this guide, perhaps it is because a word (ADHD) has started going round in your head. Maybe you were diagnosed recently, maybe you are still wondering. Either way, you probably carry a long history with you: things left half-done, the feeling of not measuring up.',
            'I want to tell you one thing right away, and I would like you to read it slowly: you are not lazy, and you are not broken. Your mind works in a certain way, and that way has a history, a meaning, and strengths too that perhaps you have never learned to see.',
            'This guide is for exactly that: to give you clear words to understand yourself, stories you can recognise yourself in, and a few strategies that do not try to "fix" you, but to stand on your side. It is not a manual, not a therapy: it is more like a long conversation with someone trying to explain how you work, with respect, and without hurry.',
            'End of excerpt.',
            'The full guide (in Italian) covers: how your attention works, why chaos sometimes makes sense, the strategies that are on your side, and how (and when) to ask a professional for help.'
          ]
        },
        es: {
          kicker: 'Extracto gratuito · Guía para pacientes',
          title: 'TDAH en la adultez: una guía para entenderte',
          buyHref: 'https://psicovoice.gumroad.com/l/adhd-da-adulto-guida',
          ctaText: 'La guía completa continúa con las estrategias que están de tu lado y con cómo pedir ayuda cuando hace falta. (Edición en italiano.)',
          ctaLabel: 'Compra la guía en Gumroad',
          body: [
            'Si has abierto esta guía, quizás sea porque una palabra (TDAH) ha empezado a darte vueltas en la cabeza. Puede que te hayan diagnosticado hace poco, puede que todavía te lo estés preguntando. En cualquier caso, probablemente cargas con una larga historia: cosas dejadas a medias, la sensación de no estar a la altura.',
            'Quiero decirte una cosa de inmediato, y me gustaría que la leyeras despacio: no eres perezoso, y no estás roto. Tu mente funciona de una manera, y esa manera tiene una historia, un sentido, y también puntos fuertes que quizás nunca has aprendido a ver.',
            'Esta guía sirve para eso: darte palabras claras para entenderte, historias en las que reconocerte, y algunas estrategias que no buscan «arreglarte», sino estar de tu lado. No es un manual, no es una terapia: es más como una larga conversación con alguien que intenta explicarte cómo funcionas, con respeto, y sin prisa.',
            'Fin del extracto.',
            'La guía completa (en italiano) incluye: cómo funciona tu atención, por qué a veces el caos tiene un sentido, las estrategias que están de tu lado, y cómo (y cuándo) pedir ayuda a un profesional.'
          ]
        }
      },
      'comp-adhd-en': {
        kicker: 'Estratto gratuito · Compendio in inglese',
        title: 'Adult ADHD: a psychodynamic compendium',
        buyHref: 'https://psicovoice.gumroad.com/l/adult-adhd-psychodynamic',
        ctaText: 'Questa è l\'edizione inglese del compendio per clinici, e il testo completo raccoglie tutti i capitoli, dalla teoria al materiale clinico.',
        ctaLabel: 'Acquista il compendio (EN) su Gumroad',
        body: [
          'Questo è l\'estratto della versione inglese del compendio, pensata per i colleghi che lavorano in inglese, e qui sotto ne trovi l\'anteprima nella lingua originale.',
          'This compendium grows from a simple conviction: that on adult ADHD the psychodynamic gaze still has something to say, and that saying it does not mean opposing the neurobiological evidence, but inhabiting the space that evidence leaves uncovered.',
          'The clinician who works psychodynamically meets, in the consulting room, something the neurobiological maps do not exhaust: a way of being in relationship, a history of attention and its interruption, a meaning the symptom carries that does not dissolve the moment we call it a "deficit."',
          'The adult patient with ADHD almost never arrives carrying "a deficit." They arrive carrying a life. Our task begins there: not in confirming or refuting the diagnosis, but in restoring to the person the possibility of thinking about themselves.',
          'End of excerpt.',
          'The full compendium covers: the theoretical debate, the psychic function at stake, the clinical picture re-read in session, differential diagnosis, transference and countertransference, technical choices, the work on coping, the relationship with medication, and clinical material.'
        ],
        en: {
          kicker: 'Free excerpt · Compendium for clinicians',
          title: 'Adult ADHD: a psychodynamic compendium',
          buyHref: 'https://psicovoice.gumroad.com/l/adult-adhd-psychodynamic',
          ctaText: 'This is only the opening: the full compendium gathers every chapter, from theory to clinical material.',
          ctaLabel: 'Buy the compendium on Gumroad',
          body: [
            'This compendium grows from a simple conviction: that on adult ADHD the psychodynamic gaze still has something to say, and that saying it does not mean opposing the neurobiological evidence but inhabiting the space that evidence leaves uncovered.',
            'The current literature on adult ADHD is overwhelmingly neurobiological and cognitive-behavioural. It is valuable knowledge, and this text does not contest it. But the clinician who works psychodynamically meets, in the consulting room, something those maps do not exhaust: a way of being in relationship, a history of attention and its interruption, a meaning the symptom carries that does not dissolve the moment we call it a "deficit."',
            'The adult patient with ADHD almost never arrives carrying "a deficit." They arrive carrying a life: relationships that break off, projects abandoned at the crucial moment, a chronic sense of not measuring up. Our task begins there: not in confirming or refuting the diagnosis, but in restoring to the person the possibility of thinking about themselves.',
            'End of excerpt.',
            'The full compendium covers: the theoretical debate, the psychic function at stake, the clinical picture re-read in session, differential diagnosis, transference and countertransference, technical choices, the work on coping, the relationship with medication, and clinical material.'
          ]
        },
        es: {
          kicker: 'Extracto gratuito · Compendio en inglés',
          title: 'TDAH adulto: un compendio psicodinámico (EN)',
          buyHref: 'https://psicovoice.gumroad.com/l/adult-adhd-psychodynamic',
          ctaText: 'Esta es la edición inglesa del compendio para clínicos: el texto completo reúne todos los capítulos, de la teoría al material clínico.',
          ctaLabel: 'Compra el compendio (EN) en Gumroad',
          body: [
            'Este es el extracto de la versión inglesa del compendio, pensada para colegas que trabajan en lengua inglesa. A continuación encontrarás la vista previa en el idioma original (inglés).',
            'This compendium grows from a simple conviction: that on adult ADHD the psychodynamic gaze still has something to say, and that saying it does not mean opposing the neurobiological evidence, but inhabiting the space that evidence leaves uncovered.',
            'The clinician who works psychodynamically meets, in the consulting room, something the neurobiological maps do not exhaust: a way of being in relationship, a history of attention and its interruption, a meaning the symptom carries.',
            'The adult patient with ADHD almost never arrives carrying "a deficit." They arrive carrying a life. Our task begins there: not in confirming or refuting the diagnosis, but in restoring to the person the possibility of thinking about themselves.',
            'End of excerpt.',
            'The full compendium covers: the theoretical debate, the psychic function at stake, the clinical picture re-read in session, differential diagnosis, transference and countertransference, technical choices, coping, medication, and clinical material.'
          ]
        }
      },
      'ia-macchina': {
        kicker: 'Psicologia & tecnologia',
        title: 'Perché è più facile parlarne a una macchina',
        ctaText: 'Questo articolo esiste anche come guida in PDF, che ti mando gratis per email.',
        ctaLabel: 'Ricevi la guida gratuita',
        ctaHref: '/guida-parlare-con-ia/',
        body: [
          'Qualche settimana fa ho scritto del ricorso con cui il Consiglio Nazionale dell\'Ordine degli Psicologi ha portato in tribunale una piattaforma che offre sedute condotte da terapeuti generati con l\'intelligenza artificiale, e chiudevo dicendo che dietro quel fenomeno c\'è una domanda di ascolto enorme e in larga parte senza risposta.',
          'Quella frase mi è rimasta addosso, perché l\'avevo lasciata a metà. Dire che c\'è una domanda è facile, mentre il mestiere comincia dopo, quando ci si chiede quale domanda sia. Vorrei provare a farlo qui, perché è la parte che mi riguarda più da vicino e perché sospetto che riguardi anche te, se ti è capitato di scrivere a un\'app cose che non hai detto a nessuno.',
          'Mettiamo da parte, per il momento, se una macchina possa fare terapia, che è una domanda legittima e di cui ho scritto altrove. Qui me ne interessa un\'altra, più scomoda, e cioè perché ci venga così facile.',
          '## Cosa rende facile',
          'Conviene restare sul concreto, perché è nel dettaglio che si vede il meccanismo.',
          'Una macchina non ti interrompe e non si stanca a metà del racconto. Non ha una faccia che cambia mentre parli, e le facce, quando stai dicendo qualcosa di cui ti vergogni, le guardi con un\'attenzione che non useresti per nient\'altro. Non ha una sua giornata storta, non ti chiede niente in cambio, non ti obbliga a scegliere il momento giusto né a temere di essere di peso, e soprattutto non la puoi deludere.',
          'Nessuna di queste cose è banale, e messe insieme descrivono una condizione che nella vita di tutti i giorni praticamente non esiste, quella in cui puoi dire qualsiasi cosa senza che quello che dici abbia conseguenze su chi ti ascolta.',
          'Il sollievo che ne segue è reale, e su questo vorrei essere netto, perché la tentazione di liquidarlo è forte e sarebbe un errore. Chi ha passato la notte a scrivere a un\'app non stava sprecando tempo; stava facendo l\'unica cosa che in quel momento riusciva a fare, e spesso ha smesso di girare in tondo. In questo non c\'è niente da correggere.',
          '## Cosa dice quella facilità',
          'Qui però la domanda si sposta, ed è proprio lo spostamento che mi interessa.',
          'Se parlare a una macchina è più facile, è perché parlare a una persona costa, e vale la pena chiedersi che cosa costi esattamente. Non parlo del tempo, dei soldi o delle liste d\'attesa, che sono ostacoli veri ma appartengono a un\'altra storia. Parlare a una persona costa perché l\'altro reagisce, perché quello che dici gli arriva addosso e produce qualcosa, un\'espressione, un silenzio, una domanda che non avevi previsto, a volte un fastidio.',
          'Il nodo sta qui, perché quella reazione è insieme il costo e il punto.',
          'Il sollievo di parlare a una macchina non è finto, e allo stesso tempo non è terapia. Le due cose stanno insieme, ed è tenendole insieme che si capisce qualcosa, perché ciò che rende l\'interfaccia così accogliente, il fatto che non reagisce davvero, è esattamente ciò che le impedisce di curare.',
          '## La parola che manca',
          'Di solito, a questo punto, si tira in ballo l\'empatia e si dice che a una macchina manca proprio quella. Non credo sia la parola giusta, anche perché ormai si usa per dire tutto e niente, e un sistema addestrato bene produce risposte più calde e più attente di parecchi esseri umani in una giornata storta.',
          'La parola che manca, credo, è un\'altra, ed è rischio.',
          'In una relazione clinica rischi qualcosa, che l\'altro si annoi o che ti giudichi, che si stanchi di te, che pensi che stai esagerando o che non ce la faccia a reggere quello che gli porti, e non si tratta di un rischio teorico, perché è la ragione per cui, la prima volta, la voce trema.',
          'Poi succede una cosa che nessuna macchina può far succedere, perché l\'altro regge. Torna la settimana dopo, si ricorda di quella cosa che avevi detto di sfuggita e ci riporta sopra; non si è annoiato, oppure si è annoiato e te lo dice, e non è finito il mondo. Resta pur avendo potuto andarsene, e questo è un dato più che un sentimento, perché qualcuno che poteva ritirarsi non l\'ha fatto.',
          'È quel dato che sposta qualcosa, più dell\'ascolto in sé, perché è la prova che quell\'ascolto era libero. Con qualcosa che non può andarsene la prova non si può fare, dal momento che non c\'era niente in gioco.',
          'Aggiungo una cosa, e la dico da persona che ha lavorato per anni dentro piattaforme di salute mentale digitale, non da nostalgico della carta. Un sistema costruito per esserti utile e per non dispiacerti tenderà, per come è fatto, a darti ragione, restituendoti una versione ordinata e comprensiva di quello che gli hai appena detto. Dopo tre mesi di conversazioni così ti sentirai capito, e ti troverai esattamente dove eri partito, con un vocabolario migliore per descriverlo.',
          '## Cosa puoi osservare, in concreto',
          'Non ti propongo di smettere, ma di farti tre domande che valgono più di qualsiasi regola generale.',
          'La prima riguarda che cosa stai chiedendo, davvero. Rileggi una di quelle conversazioni notturne e guarda che forma ha la tua richiesta, se stai chiedendo di essere rassicurato, di avere un pubblico o di trovare un posto dove pensare a voce alta senza che nessuno se ne faccia carico. Sono richieste diverse, che portano in direzioni diverse, e la terza, per esempio, è una domanda seria che merita un interlocutore serio.',
          'La seconda riguarda che cosa succede dopo. Un\'ora dopo, o il giorno dopo, ti senti più leggero e basta, oppure qualcosa si è mosso, hai fatto una telefonata, hai detto una frase che rimandavi, hai deciso qualcosa? Se il sollievo arriva sempre e il movimento non arriva mai, quel sollievo funziona come un antidolorifico preso ogni sera, che fa il suo lavoro mentre nessuno guarda il dente.',
          'La terza è la più scomoda, e riguarda a chi non lo stai dicendo. Quasi sempre, accanto alla persona che scrive di notte a un\'app, c\'è una persona in carne e ossa a cui quella cosa non è stata detta, e vale la pena chiedersi chi sia e che cosa si tema che succeda dicendogliela.',
          '## Quello che resta',
          'La domanda con cui ho cominciato non era se una macchina possa sostituire un terapeuta, ma perché ci sembri meno rischioso parlare a qualcosa che non può restare.',
          'Credo che la risposta sia semplice e poco consolante. Da qualche parte, e con qualcuno, abbiamo imparato che dire certe cose a una persona ha un prezzo; quell\'apprendimento ha una storia, e le storie si possono ripercorrere. È esattamente il lavoro che si fa in terapia, che quasi sempre comincia proprio da qui, da come mai sia diventato così difficile parlare.',
          'Se quello che hai letto ti riguarda da vicino, non serve che tu arrivi preparato o che tu sappia già che cosa chiedere. Basta cominciare da una persona, anche solo per capire se serve, e che cosa.'
        ]
      },
      'ia-terapeuta': {
        kicker: 'Psicologia & tecnologia',
        title: 'Un\'intelligenza artificiale può farti da terapeuta?',
        body: [
          'L\'8 luglio scorso il Consiglio Nazionale dell\'Ordine degli Psicologi è andato in tribunale contro un\'azienda che offre sedute di terapia condotte da terapeuti generati con l\'intelligenza artificiale. Sembra una notizia di categoria, roba per addetti ai lavori, e invece riguarda anche te, se ti è capitato di aprire un\'app alle due di notte perché non riuscivi a dormire e non volevi svegliare nessuno.',
          'Vorrei spiegarti che cosa è successo davvero e soprattutto che cosa c\'è in gioco, perché la risposta è molto più interessante di un generico «la tecnologia fa male».',
          '## Cosa è successo',
          'La piattaforma si chiama Therapeak, ha sede in Olanda e si presenta agli utenti come un servizio di supporto psicologico e terapeutico, in cui i «terapeuti» sono generati da un sistema di intelligenza artificiale. Raccolgono informazioni sul tuo stato emotivo, sulle tue relazioni e sulla tua salute mentale, e conducono quelle che il servizio chiama sedute automatizzate, senza nessun professionista abilitato dall\'altra parte.',
          'L\'Ordine ha depositato al Tribunale di Roma un ricorso d\'urgenza per bloccare il servizio in Italia con effetto immediato, e le ragioni sono più d\'una. La legge 56 del 1989 riserva l\'attività psicologica a chi è iscritto all\'Albo, la nuova legge italiana sull\'intelligenza artificiale e il regolamento europeo pongono limiti precisi, e c\'è poi la questione dei dati sanitari, la più delicata di tutte. Prima del ricorso erano già partite le segnalazioni all\'Agenzia per la Cybersicurezza e al Garante Privacy, insieme a una denuncia alla Polizia Postale per esercizio abusivo della professione.',
          'È il primo caso in Italia in cui un ordine professionale porta davanti a un giudice la domanda se un algoritmo possa fare terapia.',
          '## Il punto non è la tecnologia',
          'Qui vale la pena fermarsi, perché la discussione si sta già polarizzando, e una discussione polarizzata non aiuta nessuno.',
          'Non ogni strumento digitale in ambito psicologico è un problema. Le app che aiutano a tenere un diario dell\'umore o guidano in un esercizio di respirazione, i promemoria per prendere una terapia, i teleconsulti con un professionista reale che vive a quattrocento chilometri da te funzionano, allargano l\'accesso e per molte persone sono l\'unica porta d\'ingresso praticabile.',
          'Non è vero nemmeno il contrario, cioè che se un sistema risponde bene, con parole appropriate e tono gentile, allora quello che sta facendo sia terapia. Un modello linguistico è bravissimo a produrre risposte plausibili, ma la plausibilità non è cura.',
          'Il punto, quindi, riguarda meno la tecnologia che ciò che accade dentro una relazione terapeutica, e se quella cosa sia replicabile da un sistema che genera testo.',
          '## Cosa succede davvero in una seduta',
          'Prova a pensare a che cosa cerchi, quando cerchi aiuto.',
          'Non stai cercando la risposta giusta, perché se fosse quello la troveresti in un libro o in un video, e spesso ci hai già provato. Stai cercando qualcuno che regga quello che gli porti, che si lasci toccare da ciò che dici e che, proprio perché ne è toccato, a volte non ti dia ragione.',
          'Quando si parla di psicoterapia e intelligenza artificiale, è questo il passaggio che mi interessa di più. Un sistema addestrato a essere utile e a non dispiacerti tenderà, per costruzione, ad assecondarti, rimandandoti una versione ordinata e comprensiva di quello che gli hai appena detto, e tu ti sentirai capito.',
          'Una parte importante del lavoro clinico, però, consiste proprio nell\'incontrare qualcosa che non ti asseconda, che sia un limite o una domanda che non avevi previsto e che ti infastidisce. Penso al momento in cui il tuo terapeuta nota che stai raccontando la stessa storia per la quarta volta con parole diverse, e te lo dice; quel momento non è confortevole, ma è quello in cui qualcosa si muove.',
          'C\'è poi la questione del rischio, su cui devo essere netto. Quando una persona sta molto male serve qualcuno che se ne accorga e che risponda con la responsabilità professionale e legale di chi ha una formazione alle spalle, e un sistema automatico quella responsabilità non ce l\'ha, né la può avere.',
          '## E i tuoi dati?',
          'Questa parte di solito viene dopo, e invece dovrebbe venire prima.',
          'Quello che racconti alle tre di notte, quando finalmente smetti di controllare le parole, è probabilmente l\'informazione più sensibile che possiedi su di te, più del tuo conto corrente e più delle tue analisi del sangue.',
          'In una relazione clinica quel materiale è protetto dal segreto professionale, da un codice deontologico e da un ordine che può sanzionare chi lo viola. Su una piattaforma commerciale diventa un dato, conservato da qualche parte, sotto una giurisdizione che magari non è la tua e usato secondo condizioni che hai accettato scorrendo velocemente fino al pulsante blu, e questo, più che un dettaglio tecnico, è il cuore della faccenda.',
          '## Cosa puoi fare, in concreto',
          'Le cose che puoi fare sono tre, e sono semplici.',
          'La prima è verificare chi hai davanti. L\'Albo degli Psicologi è pubblico e consultabile online, con nome, cognome, numero di iscrizione e l\'indicazione se la persona è anche psicoterapeuta, e ci metti trenta secondi. Se un servizio non ti permette di sapere chi ti sta ascoltando, quella è già l\'informazione che ti serviva.',
          'La seconda è distinguere tra psicologo e psicoterapeuta, che sono due figure diverse e che i siti commerciali tendono a confondere, perché la distinzione complica la vendita. Lo psicoterapeuta ha fatto una formazione specifica di almeno quattro anni dopo la laurea e l\'abilitazione, e chiederlo è del tutto legittimo.',
          'La terza è usare gli strumenti digitali per quello che sono. Un\'app per monitorare il sonno, l\'umore o l\'ansia può darti dati preziosi da portare in seduta, non da usare al posto della seduta, e questa differenza cambia tutto.',
          '## Una cosa che resta da dire',
          'Il fatto che milioni di persone parlino di sé a un sistema automatico non è soltanto un problema di regole da far rispettare, ma anche un segnale che va letto.',
          'Dice che c\'è una domanda di ascolto enorme e in larga parte senza risposta, e che arrivare a un professionista costa, passa per liste d\'attesa e a volte chiede di attraversare una vergogna che non tutti riescono ad attraversare. Un\'interfaccia che non ti giudica, disponibile alle tre di notte e senza appuntamento, risponde a un bisogno vero.',
          'Difendere la specificità del lavoro psicologico non significa difendere una posizione di rendita, ma dire che quel bisogno merita una risposta all\'altezza e non una sua imitazione ben scritta.',
          'Se stai attraversando un periodo difficile e non sai da dove cominciare, cominciare da una persona è già molto, anche solo per capire se serve, e che cosa.'
        ]
      },
      burnout: {
        kicker: 'Lavoro & benessere',
        title: 'Burnout: quando è il contesto a chiederti troppo',
        body: [
          'Per molte persone che lavorano arriva un momento in cui la stanchezza smette di essere normale. Non è più la fatica di una settimana intensa, che un fine settimana può ricucire, ma un esaurimento che si accumula, un cinismo che cresce verso ciò che prima appassionava e la sensazione di valere sempre meno nonostante gli sforzi. L\'Organizzazione Mondiale della Sanità chiama questa condizione burnout e la definisce, non a caso, un fenomeno occupazionale, cioè qualcosa che nasce nel rapporto tra la persona e il suo lavoro e non un difetto della persona.',
          'Il punto è decisivo, perché chi vive un burnout tende quasi sempre a colpevolizzarsi, dicendosi che non è abbastanza resistente, che gli altri ce la fanno, che deve solo organizzarsi meglio. Ho passato anni dentro organizzazioni in forte crescita, coordinando decine di professionisti, e ho visto da vicino quanto spesso il problema non fosse la fragilità dei singoli ma un contesto che chiedeva troppo, in modo confuso, senza riconoscimento e senza spazi di recupero.',
          'I segnali a cui prestare attenzione sono tre, e di solito arrivano in quest\'ordine. Prima l\'esaurimento emotivo, per cui ci si sveglia già stanchi e ogni richiesta sembra insostenibile; poi la depersonalizzazione, quando ci si scopre cinici, distaccati, irritabili verso colleghi e clienti; infine il crollo del senso di efficacia, con la convinzione sempre più radicata di non fare mai abbastanza. Spesso si aggiungono disturbi del sonno, sintomi fisici e un progressivo ritiro dalla vita fuori dal lavoro.',
          'Viene da chiedersi che cosa possa fare la psicoterapia, se il problema riguarda anche il contesto, e la risposta è che può fare molto, proprio perché lavora sul rapporto tra te e quel contesto. In un percorso possiamo capire quale domanda il burnout sta portando, che cosa stavi chiedendo a quel lavoro, quali attese si sono spezzate, quali confini non sei riuscito a difendere e perché. Più che «gestire lo stress», si tratta di riprendere in mano il rapporto con il proprio lavoro, e a volte di scoprire che la richiesta più profonda riguarda altro, come il riconoscimento, l\'appartenenza o una direzione.',
          'Se ti riconosci in questi segnali, non aspettare che passino da soli, perché il burnout lasciato correre tende ad approfondirsi. Parlarne con un professionista non significa ammettere una sconfitta, ma cominciare a trattare la tua energia come la risorsa preziosa che è.'
        ]
      },
      ansia: {
        kicker: 'Ansia',
        title: 'L\'ansia, un messaggio da tradurre più che un nemico',
        body: [
          'Chi ha vissuto un attacco di panico lo racconta quasi sempre allo stesso modo, come qualcosa che «è arrivato dal nulla», con il cuore che accelera, il fiato corto, la sensazione di perdere il controllo o di morire. Poi arriva la paura della paura, con l\'evitamento dei luoghi e una vita che si restringe. Anche l\'ansia più diffusa e silenziosa, quella che tiene svegli la notte, fa rimuginare e trasforma ogni scelta in un esame, sembra spesso non avere motivo.',
          'Eppure, nella mia esperienza clinica, l\'ansia un motivo ce l\'ha quasi sempre. Più che un guasto da riparare è un segnale da tradurre, il modo in cui qualcosa dentro di noi ci avverte di un conflitto tra la vita che stiamo facendo e qualcosa che sentiamo, desideriamo o temiamo. Può trattarsi di un lavoro che non ci corrisponde più, di una relazione in cui non riusciamo a dire la verità, di un cambiamento che vorremmo fare e non ci autorizziamo a fare.',
          'L\'approccio psicoanalitico fondato sull\'Analisi della Domanda parte proprio da qui, e invece di chiedersi soltanto come far sparire l\'ansia si chiede che cosa stia cercando di dire. La differenza è sostanziale, perché le tecniche per calmare i sintomi esistono e hanno il loro valore, ma se il messaggio resta inascoltato l\'ansia tende a tornare, magari cambiando forma.',
          'In terapia l\'ansia si lavora dandole parole. Ricostruiamo insieme quando ha cominciato a farsi sentire, in quali situazioni si intensifica, che cosa stava accadendo nella tua vita e nelle tue relazioni, e piano piano quello che sembrava un nemico irrazionale rivela una sua logica. Quando l\'ansia acquista senso smette di essere un\'onda che ti travolge e diventa un\'informazione che puoi usare.',
          'Il percorso non promette una vita senza ansia, che nessuno può promettere e che non sarebbe nemmeno desiderabile, dal momento che l\'ansia, nella giusta misura, ci protegge e ci orienta. Lavora piuttosto verso qualcosa di più realistico, cioè smettere di subirla, capirla e riprendere le decisioni che ti eri tolto.'
        ]
      },
      domanda: {
        kicker: 'Analisi della Domanda',
        title: '"Cosa sto chiedendo davvero?" Il potere di capire la propria domanda',
        body: [
          'Quando una persona contatta uno psicoterapeuta, di solito porta una richiesta chiara, come smettere di avere attacchi di panico, uscire da una tristezza o litigare meno con il proprio compagno. È una porta d\'ingresso legittima e importante, ma chi lavora con l\'Analisi della Domanda sa che dietro quella prima richiesta ce n\'è quasi sempre un\'altra, più profonda, che aspetta di trovare le sue parole.',
          'L\'Analisi della Domanda è la prospettiva clinica in cui mi sono specializzato, un approccio psicoanalitico sviluppato in Italia che mette al centro non l\'etichetta diagnostica ma il significato della richiesta d\'aiuto dentro la storia e i contesti di chi la porta. La domanda «aiutami a non sentire più ansia» può voler dire, a seconda della persona, «aiutami a lasciare questo lavoro senza sentirmi in colpa», «aiutami a essere visto da mio padre» oppure «aiutami a capire se questa relazione è ancora la mia».',
          'Conta perché, finché lavoriamo solo sul sintomo, trattiamo la persona come un meccanismo da aggiustare. Quando invece esploriamo la domanda la persona torna a essere protagonista, e scopre che il suo malessere non è un errore del sistema ma un messaggio sensato dentro le sue relazioni, con il partner, con la famiglia, con il lavoro e con le proprie aspettative.',
          'Il primo colloquio serve proprio a questo, e non è un interrogatorio né un test ma uno spazio in cui raccontarti, in cui io ascolto non solo che cosa chiedi ma come lo chiedi, che cosa ti ha spinto a chiederlo adesso, che cosa immagini che la terapia possa fare per te. Da lì costruiamo insieme un obiettivo che sia davvero tuo, invece di un protocollo standard.',
          'Se stai pensando di cominciare un percorso, ti propongo un piccolo esercizio, che consiste nel completare per iscritto la frase «chiedo aiuto perché…» tre volte, con tre risposte diverse. Spesso la terza risposta è la più vera, e se ti va puoi portarla con te al primo colloquio, dove sarà un buon punto di partenza.'
        ]
      },
      expat: {
        kicker: 'Vivere all\'estero',
        title: 'Vivere altrove: la fatica invisibile di chi parte',
        body: [
          'Di chi va a vivere all\'estero si raccontano quasi solo le fortune, le opportunità, gli stipendi, le città nuove, la libertà, ed è tutto vero. C\'è però un\'altra metà della storia che si racconta poco, perché sembra ingrata, ed è che l\'espatrio è anche una perdita. Si lascia una lingua in cui si è spiritosi, una rete di persone che ci conoscono da sempre e quei riti minimi che tengono insieme le giornate, come il bar sotto casa, le telefonate della domenica o il modo in cui si festeggia un compleanno.',
          'Gli psicologi che si occupano di migrazione parlano di «lutto migratorio», un lutto particolare perché ciò che si è perso continua a esistere, lontano, e ogni videochiamata lo ricorda. A questo si aggiungono fatiche specifiche, come la sensazione di essere sempre un po\' stranieri (anche quando si torna «a casa», dove nel frattempo la vita è andata avanti), la stanchezza di vivere e lavorare in una seconda lingua, la difficoltà di costruire amicizie profonde da adulti e la domanda ricorrente, «ho fatto bene a partire?», che si riaccende a ogni difficoltà.',
          'Ho vissuto e lavorato tra Italia e Spagna, e per anni ho fatto parte di team internazionali composti in gran parte da persone espatriate, così che questa fatica l\'ho vista e conosciuta da vicino. So quanto spesso resti invisibile, perché chi è partito sente di non avere il diritto di lamentarsi, dal momento che è stata una scelta e da fuori sembra una scelta fortunata.',
          'Per chi vive all\'estero la psicoterapia online in italiano ha un valore particolare, che va oltre la comodità logistica, perché permette di lavorare sulle proprie questioni nella lingua in cui sono nate, la lingua dei ricordi, della famiglia, delle emozioni più antiche. Molte sfumature che in una seconda lingua si perdono, in italiano ritrovano subito il loro peso e il loro senso.',
          'Se vivi all\'estero e senti che qualcosa si è appesantito, che sia una nostalgia che non passa, un senso di sospensione, relazioni che non decollano o semplicemente il bisogno di fare il punto, un percorso terapeutico può aiutarti a dare un nome a ciò che stai attraversando. Le sedute si adattano al tuo fuso orario, e il lavoro può continuare ovunque ti porti il prossimo trasloco.'
        ]
      },
      chisono: {
        kicker: 'Su di me',
        title: 'Perché faccio questo mestiere (e perché in due mondi)',
        body: [
          'Quando mi chiedono che lavoro faccio, la risposta breve è «lo psicoterapeuta». Quella lunga è più interessante, perché sono uno psicoterapeuta che per anni ha lavorato anche dall\'altra parte, dentro le organizzazioni, a gestire persone, team e processi, e sono convinto che ciascuna delle due anime renda migliore l\'altra.',
          'Il percorso clinico è quello classico, fatto con pazienza, con la laurea in Psicologia Clinica alla Sapienza di Roma, l\'abilitazione nel 2018 e poi quattro anni di scuola di specializzazione in Psicoterapia Psicoanalitica alla SPS di Roma, conclusa nel 2022. Lì ho incontrato l\'Analisi della Domanda, l\'approccio che ha dato forma al mio modo di lavorare, secondo cui la sofferenza non va solo classificata e trattata ma capita dentro la storia e le relazioni di chi la porta.',
          'Il percorso organizzativo è nato quasi in parallelo, e non per caso, perché lavorando nei servizi socio-sanitari ho scoperto che i contesti, cioè i gruppi, le istituzioni e le culture organizzative, hanno una psicologia tanto quanto le persone. Così, quando la salute mentale digitale è esplosa in Italia, mi sono trovato nel posto giusto. In Unobravo ho guidato il team clinico come Clinical Team Lead, collaborando a qualità, retention ed engagement dei terapeuti e curando la formazione ECM, e poi in BetterHelp, la più grande piattaforma di terapia online al mondo, ho gestito le operations cliniche per i mercati europei.',
          'Da questa doppia vita è nata anche PsicoVoice, il software che ho fondato per aiutare gli psicologi a gestire la parte professionale e amministrativa del loro lavoro, ed è il mio modo di restituire qualcosa a una categoria che conosco da dentro, in entrambi i ruoli.',
          'Che cosa c\'entra tutto questo con te, che magari stai valutando una terapia? Credo c\'entri per una ragione semplice, perché quando mi parli di un capo che ti logora, di un licenziamento, della paura di non essere all\'altezza, della vita da espatriato o del desiderio di cambiare strada, io quel mondo non devo immaginarlo. Ci ho lavorato dentro ogni giorno, ai livelli in cui le decisioni si prendono, e questo mi permette di ascoltare la tua storia con due orecchie diverse, quella clinica, che cerca il senso profondo, e quella organizzativa, che conosce il contesto reale in cui vivi.',
          'Il resto, cioè il modo in cui lavoro e che cosa puoi aspettarti da un primo colloquio, è scritto nelle altre pagine di questo sito. Se dovessi riassumere in una frase perché faccio questo mestiere, direi che ogni richiesta d\'aiuto contiene già una direzione, e che accompagnare qualcuno a trovarla è il lavoro più interessante che conosca.'
        ]
      },
      adhd: {
        kicker: 'Attenzione & trauma',
        title: 'ADHD adulto: e se la distrazione fosse anche una protezione?',
        body: [
          'Da qualche anno l\'ADHD dell\'adulto è finalmente uscito dall\'ombra, e se ne parla nei media, sui social, al lavoro. È una buona notizia, perché per decenni moltissime persone hanno attraversato scuola e carriera sentendosi «svogliate», «disordinate» o «sbagliate», senza che nessuno desse un nome alle loro difficoltà di attenzione, organizzazione e impulsività. L\'ADHD è una condizione del neurosviluppo reale e ben documentata, e chi vi si riconosce merita una valutazione seria, non lo scetticismo né una diagnosi fatta in trenta secondi.',
          'C\'è però una domanda che la clinica psicoanalitica aggiunge, e che nei percorsi di valutazione frettolosi si perde, perché l\'attenzione non è un muscolo isolato ma una funzione psichica che vive dentro una storia. Nel mio lavoro incontro adulti che arrivano con una richiesta precisa, «voglio capire se sono ADHD», e poi, ricostruendo insieme la loro storia, scopriamo che distrarsi, muoversi di continuo, riempire ogni silenzio ha avuto per anni una funzione, quella di non stare. Non stare in un ricordo, in una casa imprevedibile, in un dolore che non aveva parole.',
          'Il rapporto tra esperienze traumatiche e sintomi «da ADHD» è oggi uno dei temi più discussi della clinica dell\'adulto. Un bambino cresciuto in un ambiente instabile, conflittuale o emotivamente trascurante sviluppa spesso un\'attenzione «a radar», sempre in scansione dell\'ambiente per anticipare il pericolo e mai a fuoco su un compito. Portata nell\'età adulta, quell\'ipervigilanza somiglia moltissimo alla distraibilità, mentre l\'irrequietezza tiene a distanza ciò che affiorerebbe nella quiete e l\'impulsività scarica tensioni che non hanno mai trovato pensiero. In chiave analitica questi sintomi sono meno un difetto della macchina che un coping, una soluzione che la psiche ha trovato per sopravvivere a qualcosa e che continua a usare anche quando quel qualcosa è finito da tempo.',
          'Distinguere conta perché le strade di cura sono diverse, e spesso complementari. Non si tratta di negare l\'ADHD né di ricondurre ogni disattenzione al trauma, dal momento che le due dimensioni possono coesistere e intrecciarsi nella stessa persona, ma di non fermarsi all\'etichetta. La domanda clinica non riguarda solo quanto ti distrai, ma da che cosa, da quando, in quali contesti, e che cosa succede dentro di te in quei rari momenti in cui la mente si ferma davvero.',
          'In un percorso psicoanalitico lavoriamo proprio lì, dando spazio e parole a ciò da cui ci si è sempre distratti. Per alcune persone, quando il materiale che la mente evitava trova finalmente un posto dove essere pensato, l\'urgenza di scappare si attenua, e con lei una parte dei sintomi. Per altre l\'assetto neurobiologico resta, ma cambia il rapporto con esso, perché si lavora sul senso di inadeguatezza accumulato in anni di «potresti fare di più», si smette di combattere contro la propria mente e si impara a costruirle intorno una vita su misura.',
          'Se ti riconosci in queste righe, sul sito trovi un breve test di auto-osservazione su attenzione e impulsività, che non è una diagnosi ma può essere un primo passo per capire se vale la pena approfondire. Il secondo passo, se vorrai, è un colloquio, uno spazio in cui la tua distrazione viene ascoltata come una storia invece di essere corretta come un difetto.'
        ]
      },
      linguamadre: {
        kicker: 'Vivere all\'estero',
        title: 'Fare terapia nella lingua madre: perché le parole di casa arrivano più in profondità',
        body: [
          'C\'è un momento che molti italiani all\'estero conoscono bene. Vivi da anni in inglese, in tedesco o in spagnolo, ci lavori, ci discuti, ci fai persino battute; poi un giorno provi a raccontare qualcosa che fa male, una perdita, una paura, un ricordo d\'infanzia, e ti accorgi che all\'improvviso le parole non pesano. Sono grammaticalmente perfette ed emotivamente vuote, come se a parlare fosse un portavoce competente e non tu.',
          'Non è un tuo limite, ma la differenza tra una lingua imparata e una lingua abitata. La lingua madre, più che il primo codice che acquisiamo, è la lingua in cui siamo stati chiamati per nome, consolati, sgridati, amati. Le nostre prime relazioni ci sono arrivate come suoni, ritmi e tono di voce prima ancora che come significati, e su quella musica si è costruita la nostra vita emotiva. La psicoanalisi lo osserva da sempre, perché i sogni, i lapsus e le parole che ci commuovono senza motivo apparente parlano quasi sempre la prima lingua. L\'inconscio ha un accento, e di solito è quello di casa.',
          'In terapia la seconda lingua può funzionare da rifugio. Parlare di sé in una lingua straniera crea una distanza dagli affetti che a volte è perfino utile, e c\'è chi riesce a dire per la prima volta cose indicibili proprio perché le pronuncia in una lingua che «non brucia». Alla lunga, però, quella distanza presenta il conto, e la terapia rischia di diventare un resoconto accurato, intelligente e lontano, in cui si parla della propria vita come si compila un modulo, mentre il lavoro analitico ha bisogno del contrario, cioè che le parole tocchino ciò che nominano.',
          'In una seduta in italiano cambia qualcosa di concreto. Penso al lapsus che apre una porta inattesa, al modo di dire di famiglia che riassume un\'intera atmosfera, al dialetto che riaffiora quando si parla della nonna, all\'ironia che non ha bisogno di essere spiegata, e perfino ai silenzi, che in ogni lingua hanno una durata diversa. Il terapeuta che condivide la tua lingua madre non capisce solo che cosa dici, ma sente come lo dici, e quelle sfumature sono la materia prima con cui si lavora, non una decorazione.',
          'Per questo, per molti italiani all\'estero, scegliere la terapia in italiano è una scelta clinica prima che nostalgica. I temi che l\'espatrio muove, lo sradicamento, l\'identità che si riorganizza, le appartenenze che tirano da due parti, il lutto silenzioso di ciò che si è lasciato, sono nati in italiano, dentro storie italiane, ed è in italiano che si lasciano pensare fino in fondo, anche quando la vita di tutti i giorni ormai parla un\'altra lingua.',
          'Lavoro online da anni con italiani che vivono in Europa e nel mondo, con orari che si adattano al fuso. Se senti che è arrivato il momento di dare parole, le tue, a quello che stai attraversando, il primo colloquio si può fare da dove sei.'
        ]
      },
      'cs-strategia': {
        kicker: 'Case study · Strategic Planning & Ethical Decision Making',
        title: 'Un\'unica missione, due forze lavoro',
        ctaText: 'Questi sono i temi su cui scrivo e mi formo, accanto al lavoro clinico. Se vuoi scambiare due idee, scrivimi.',
        ctaLabel: 'Scrivimi',
        body: [
          'Elaborato finale del modulo Strategic Planning and Ethical Decision Making (MSc Strategic HRM, Arden University). L\'organizzazione analizzata, anonimizzata come «PsyHealth», è una piattaforma italiana di salute mentale digitale con 300 dipendenti e circa 7.000 psicologi e psicoterapeuti che collaborano in partita IVA, cresciuta da 30 a 7.300 persone in sei anni e con lo status di Società Benefit.',
          '## La domanda',
          'Può un\'organizzazione con una missione sociale dichiarata, e formalizzata nel proprio statuto, restare fedele ai suoi valori quando la sua forza lavoro è divisa in due popolazioni trattate in modo profondamente diverso? E che cosa succede quando le pratiche operative (pianificazione, esclusività, monitoraggio tramite KPI) avvicinano progressivamente la collaborazione autonoma al lavoro etero-organizzato previsto dall\'art. 2 del D.lgs 81/2015?',
          '## L\'analisi',
          'Il modello 7S di McKinsey mostra un\'organizzazione allineata negli elementi «hard» (strategia, struttura, sistemi) e divaricata in quelli «soft», dove formazione, sviluppo e gestione delle performance parlano due lingue diverse a dipendenti e collaboratori. La struttura ricalca la Flexible Firm di Atkinson, con un nucleo stabile e una periferia numericamente flessibile che però eroga la quasi totalità del servizio clinico. Letta con i modelli di Kotter e Lewin, la ristrutturazione del 2024 rivela il punto critico, perché per i dipendenti sono stati rispettati quasi tutti i passaggi di un cambiamento ben gestito e per i collaboratori quasi nessuno, con il risultato misurabile di un turnover dei professionisti salito dal 25% al 34% in un anno.',
          '## Etica e responsabilità sociale',
          'La piramide CSR di Carroll e la Triple Bottom Line di Elkington inquadrano la domanda più scomoda per una Società Benefit, cioè se la missione sociale sia genuina o soprattutto posizionamento. L\'elaborato analizza poi una decisione specifica, il mancato rinnovo di dieci coordinatori clinici senza consultazione né criteri comunicati, attraverso tre lenti etiche, consequenzialista, deontologica e dell\'etica delle virtù. La decisione fallisce tutte e tre le prove, e il quadro System 1/System 2 di Kahneman suggerisce il perché, trattandosi di una scelta rapida e intuitiva mai sottoposta a un\'analisi costi-benefici documentata.',
          '## Le conclusioni',
          'Il rischio strategico non sta nel disegno del modello duale, che risponde in modo coerente al contesto, ma nella sua esecuzione, perché dove le pratiche quotidiane erodono il confine giuridico su cui il modello si regge il «best fit» diventa fragile. La raccomandazione centrale è un cambio di ruolo per la funzione HR, che da esecutore di decisioni già prese diventa architetto dei processi, con canali di consultazione per i collaboratori e criteri trasparenti e documentati, prima che i costi si materializzino.',
          '## Cosa mi porto',
          'Mi porto l\'idea che le organizzazioni si possano leggere con la stessa attenzione con cui si ascoltano le persone, guardando la distanza tra ciò che dichiarano e ciò che fanno e i sintomi (turnover, silenzi, conflitti) con cui quella distanza chiede di essere vista.'
        ],
        en: {
          kicker: 'Case study · Strategic Planning & Ethical Decision Making',
          title: 'One mission, two workforces',
          ctaText: 'These are the themes I write and train on, alongside my clinical work. If you\'d like to exchange ideas, get in touch.',
          ctaLabel: 'Get in touch',
          body: [
            'Final assignment for the Strategic Planning and Ethical Decision Making module (MSc Strategic HRM, Arden University). The organisation analysed (anonymised as "PsyHealth") is an Italian digital mental-health platform: 300 employees and around 7,000 psychologists and psychotherapists collaborating as self-employed (Partita IVA), a growth from 30 to 7,300 people in six years, and Società Benefit (benefit corporation) status.',
            '## The question',
            'Can an organisation with a declared social mission (formalised in its own statute) stay faithful to its values when its workforce is split into two populations treated very differently? And what happens when operational practices (scheduling, exclusivity, KPI monitoring) progressively bring self-employed collaboration closer to the hetero-organised work defined by art. 2 of Legislative Decree 81/2015?',
            '## The analysis',
            'McKinsey\'s 7S model shows an organisation aligned on the "hard" elements (strategy, structure, systems) and divided on the "soft" ones: training, development and performance management speak two different languages to employees and contractors. The structure mirrors Atkinson\'s Flexible Firm: a stable core and a numerically flexible periphery that nonetheless delivers almost all of the clinical service. The 2024 restructuring, read through Kotter\'s and Lewin\'s models, reveals the critical point: for employees almost every step of well-managed change was respected; for contractors, almost none. The measurable result is contractor turnover rising from 25% to 34% in a single year.',
            '## Ethics and social responsibility',
            'Carroll\'s CSR pyramid and Elkington\'s Triple Bottom Line frame the most uncomfortable question for a benefit corporation: is the social mission genuine or mainly positioning? The assignment then analyses a specific decision, the non-renewal of ten clinical coordinators, without consultation or communicated criteria, through three ethical lenses: consequentialist, deontological and virtue ethics. The decision fails all three, and Kahneman\'s System 1/System 2 framework suggests why: a fast, intuitive choice, never subjected to a documented cost-benefit analysis.',
            '## The conclusions',
            'The strategic risk lies not in the design of the dual model, which responds coherently to its context, but in its execution: where everyday practice erodes the legal boundary the model rests on, "best fit" becomes fragile. The central recommendation is a change of role for the HR function: from executor of decisions already made to architect of the processes (consultation channels for contractors, transparent and documented criteria) before the costs materialise.',
            '## What I take from it',
            'That organisations can be read with the same attention we give to people: by looking at the gap between what they declare and what they do, and at the symptoms (turnover, silences, conflict) through which that gap asks to be seen.'
          ]
        },
        es: {
          kicker: 'Caso de estudio · Strategic Planning & Ethical Decision Making',
          title: 'Una sola misión, dos plantillas',
          ctaText: 'Estos son los temas sobre los que escribo y me formo, junto al trabajo clínico. Si quieres intercambiar ideas, escríbeme.',
          ctaLabel: 'Escríbeme',
          body: [
            'Trabajo final del módulo Strategic Planning and Ethical Decision Making (MSc Strategic HRM, Arden University). La organización analizada (anonimizada como "PsyHealth") es una plataforma italiana de salud mental digital: 300 empleados y unos 7.000 psicólogos y psicoterapeutas que colaboran como autónomos (Partita IVA), un crecimiento de 30 a 7.300 personas en seis años, y estatus de Società Benefit (empresa de beneficio).',
            '## La pregunta',
            '¿Puede una organización con una misión social declarada (y formalizada en sus estatutos) mantenerse fiel a sus valores cuando su plantilla está dividida en dos poblaciones tratadas de forma muy distinta? ¿Y qué ocurre cuando las prácticas operativas (planificación, exclusividad, seguimiento por KPI) acercan progresivamente la colaboración autónoma al trabajo hetero-organizado que define el art. 2 del Decreto Legislativo 81/2015?',
            '## El análisis',
            'El modelo 7S de McKinsey muestra una organización alineada en los elementos "duros" (estrategia, estructura, sistemas) y dividida en los "blandos": formación, desarrollo y gestión del desempeño hablan dos idiomas distintos a empleados y colaboradores. La estructura reproduce la Flexible Firm de Atkinson: un núcleo estable y una periferia numéricamente flexible que, sin embargo, presta casi todo el servicio clínico. La reestructuración de 2024, leída con los modelos de Kotter y Lewin, revela el punto crítico: para los empleados se respetaron casi todos los pasos de un cambio bien gestionado; para los colaboradores, casi ninguno. El resultado medible es una rotación de colaboradores que sube del 25% al 34% en un solo año.',
            '## Ética y responsabilidad social',
            'La pirámide de RSC de Carroll y el Triple Bottom Line de Elkington plantean la pregunta más incómoda para una empresa de beneficio: ¿la misión social es genuina o sobre todo posicionamiento? El trabajo analiza después una decisión concreta (la no renovación de diez coordinadores clínicos, sin consulta ni criterios comunicados) a través de tres lentes éticas: consecuencialista, deontológica y de la ética de las virtudes. La decisión falla en las tres, y el marco Sistema 1/Sistema 2 de Kahneman sugiere por qué: una elección rápida e intuitiva, nunca sometida a un análisis coste-beneficio documentado.',
            '## Las conclusiones',
            'El riesgo estratégico no está en el diseño del modelo dual, que responde de forma coherente a su contexto, sino en su ejecución: donde la práctica cotidiana erosiona el límite legal en el que el modelo se apoya, el "best fit" se vuelve frágil. La recomendación central es un cambio de rol para la función de RR. HH.: de ejecutora de decisiones ya tomadas a arquitecta de los procesos (canales de consulta para los colaboradores, criterios transparentes y documentados) antes de que los costes se materialicen.',
            '## Lo que me llevo',
            'Que las organizaciones se pueden leer con la misma atención con la que se escucha a las personas: mirando la distancia entre lo que declaran y lo que hacen, y los síntomas (rotación, silencios, conflictos) con los que esa distancia pide ser vista.'
          ]
        }
      },
      'cs-analytics': {
        kicker: 'Case study · People Analytics and Value Creation',
        title: 'I dati che un\'azienda guarda, e quelli che non raccoglie',
        ctaText: 'Questi sono i temi su cui scrivo e mi formo, accanto al lavoro clinico. Se vuoi scambiare due idee, scrivimi.',
        ctaLabel: 'Scrivimi',
        body: [
          'Elaborato del modulo People Analytics and Value Creation (MSc Strategic HRM, Arden University), presentato come deck di 15 slide con un podcast di commento di 15 minuti. L\'organizzazione, anonimizzata come «YTEK», è un\'azienda SaaS globale di revenue management con circa 370 persone in dodici paesi, una struttura remote-first e una forza lavoro mista di dipendenti e contractor.',
          '## La domanda',
          'I dati sulle persone diventano valore per l\'organizzazione, o restano soltanto uno strumento di controllo? La tesi centrale dell\'analisi è che YTEK genera informazione dai dati ma non l\'ha ancora convertita in intelligenza strategica, e che quel divario pesa sulla sua resilienza di lungo periodo.',
          '## L\'analisi',
          'La mappatura dei dati lungo l\'employee lifecycle rivela un\'asimmetria netta, perché le performance sono misurate ogni mese con rating, soglie e conseguenze, mentre engagement, retention e uscite non li raccoglie nessuno. La gerarchia DIKW, che va dai dati grezzi alla decisione, mostra come un punteggio diventi conoscenza solo quando qualcuno lo collega a una causa, che nel caso analizzato è un gap di competenze dopo una migrazione tecnologica. Il modello di Ulrich localizza il problema in una funzione HR che presidia bene l\'amministrazione e il cambiamento ma lascia quasi vuoto il ruolo di Employee Advocate, la voce dei lavoratori, così che i dati viaggiano solo dall\'alto verso il basso.',
          '## Il worked example',
          'Il caso più istruttivo è una academy interna di reskilling, nata dai dati (rating in calo, ore di rework in aumento) e conclusa con un esame, grazie alla quale la capacità tecnica è stata ricostruita internamente evitando i costi di sostituzione. Il ritorno dell\'investimento, però, non è mai stato misurato, e l\'azienda può dimostrare che la formazione è avvenuta ma non il valore che ha prodotto; la distinzione tra attività e valore è il cuore di tutto l\'elaborato.',
          '## Le raccomandazioni',
          'La roadmap proposta ha quattro fasi, e la loro sequenza conta quanto il contenuto. Prima viene l\'ascolto (pulse survey, exit interview), perché chiude il punto cieco più grande e genera i dati da cui tutto il resto dipende; poi il feedback a 360 gradi e la calibrazione contro i bias del valutatore unico; quindi la governance dei dati e infine una dashboard integrata. Ascoltare prima rende sensato tutto quello che viene dopo.',
          '## Cosa mi porto',
          'Mi porto la convinzione che i numeri sulle persone dicano la verità solo se qualcuno raccoglie anche le voci, perché un sistema che misura le performance ma non l\'esperienza di chi lavora ottimizza il breve periodo al prezzo della tenuta futura.'
        ],
        en: {
          kicker: 'Case study · People Analytics and Value Creation',
          title: 'The data a company watches, and the data it never collects',
          ctaText: 'These are the themes I write and train on, alongside my clinical work. If you\'d like to exchange ideas, get in touch.',
          ctaLabel: 'Get in touch',
          body: [
            'A piece from the People Analytics and Value Creation module (MSc Strategic HRM, Arden University), delivered as a 15-slide deck with a 15-minute commentary podcast. The organisation (anonymised as "YTEK") is a global SaaS company in revenue-management technology: around 370 people across twelve countries, remote-first, with a mixed workforce of employees and contractors.',
            '## The question',
            'Does people data become value for the organisation, or does it stay merely a tool of control? The core thesis of the analysis: YTEK generates information from data, but has not yet converted it into strategic intelligence, and that gap weighs on its long-term resilience.',
            '## The analysis',
            'Mapping the data across the employee lifecycle reveals a sharp asymmetry: performance is measured every month with ratings, thresholds and consequences, while engagement, retention and exits are collected by no one. The DIKW hierarchy (from raw data to decision) shows how a score becomes knowledge only when someone links it to a cause, in this case, a skills gap after a technology migration. Ulrich\'s model locates the problem: the HR function handles administration and change well, but the Employee Advocate role (the workers\' voice) is almost absent, and data travels only top-down.',
            '## The worked example',
            'The most instructive case is an internal reskilling academy, born from the data (falling ratings, rising rework hours) and ending with an exam: technical capability was rebuilt in-house, avoiding replacement costs. But the return on that investment was never measured, so the company can show that the training happened, not the value it produced. The distinction between activity and value is the heart of the whole piece.',
            '## The recommendations',
            'A four-phase roadmap, where the sequence is the point: first listening (pulse surveys, exit interviews), because it closes the biggest blind spot and generates the data everything else depends on; then 360-degree feedback and calibration against single-rater bias; then data governance; finally an integrated dashboard. Listening first is what makes everything after it meaningful.',
            '## What I take from it',
            'That the numbers about people tell the truth only if someone also gathers the voices: a system that measures performance but not the experience of those who work optimises the short term at the cost of future resilience.'
          ]
        },
        es: {
          kicker: 'Caso de estudio · People Analytics and Value Creation',
          title: 'Los datos que una empresa mira, y los que no recoge',
          ctaText: 'Estos son los temas sobre los que escribo y me formo, junto al trabajo clínico. Si quieres intercambiar ideas, escríbeme.',
          ctaLabel: 'Escríbeme',
          body: [
            'Trabajo del módulo People Analytics and Value Creation (MSc Strategic HRM, Arden University), presentado como un deck de 15 diapositivas con un pódcast de comentario de 15 minutos. La organización (anonimizada como "YTEK") es una empresa SaaS global de tecnología de revenue management: unas 370 personas en doce países, estructura remote-first, con una plantilla mixta de empleados y colaboradores.',
            '## La pregunta',
            '¿Los datos de personas se convierten en valor para la organización, o siguen siendo solo una herramienta de control? La tesis central del análisis: YTEK genera información a partir de los datos, pero aún no la ha convertido en inteligencia estratégica, y esa brecha pesa sobre su resiliencia a largo plazo.',
            '## El análisis',
            'El mapeo de los datos a lo largo del employee lifecycle revela una asimetría nítida: el desempeño se mide cada mes con valoraciones, umbrales y consecuencias, mientras que el compromiso, la retención y las salidas no los recoge nadie. La jerarquía DIKW (del dato bruto a la decisión) muestra cómo una puntuación se vuelve conocimiento solo cuando alguien la vincula a una causa, en este caso, una brecha de competencias tras una migración tecnológica. El modelo de Ulrich localiza el problema: la función de RR. HH. gestiona bien la administración y el cambio, pero el rol de Employee Advocate (la voz de los trabajadores) está casi ausente, y los datos viajan solo de arriba abajo.',
            '## El worked example',
            'El caso más instructivo es una academia interna de reskilling, nacida de los datos (valoraciones a la baja, horas de rework al alza) y concluida con un examen: la capacidad técnica se reconstruyó internamente, evitando los costes de sustitución. Pero el retorno de esa inversión nunca se midió, así que la empresa puede demostrar que la formación tuvo lugar, no el valor que produjo. La distinción entre actividad y valor es el corazón de todo el trabajo.',
            '## Las recomendaciones',
            'Una hoja de ruta en cuatro fases, donde la secuencia es lo importante: primero la escucha (pulse surveys, entrevistas de salida), porque cierra el mayor punto ciego y genera los datos de los que depende todo lo demás; luego feedback de 360 grados y calibración contra el sesgo del evaluador único; después la gobernanza de los datos; por último un dashboard integrado. Escuchar primero es lo que da sentido a todo lo que viene después.',
            '## Lo que me llevo',
            'Que los números sobre las personas dicen la verdad solo si alguien recoge también las voces: un sistema que mide el desempeño pero no la experiencia de quien trabaja optimiza el corto plazo a costa de la solidez futura.'
          ]
        }
      },
      'cs-relazioni': {
        kicker: 'Case study · Employment Relations & Employment Law',
        title: 'Il terapeuta e l\'algoritmo',
        ctaText: 'Questi sono i temi su cui scrivo e mi formo, accanto al lavoro clinico. Se vuoi scambiare due idee, scrivimi.',
        ctaLabel: 'Scrivimi',
        body: [
          'Elaborato del modulo Strategic Employment Relations and Employment Law (MSc Strategic HRM, Arden University). L\'organizzazione analizzata, anonimizzata come «BestPsy», è una piattaforma globale di terapia online che ingaggia circa 30.000 terapeuti come contractor indipendenti in più di venti paesi. Il focus è sull\'operazione italiana, un modello standardizzato e mediato dall\'algoritmo calato in un contesto senza sindacato né contrattazione collettiva.',
          '## La domanda',
          'Che cosa succede alle relazioni di lavoro quando le regole non le negozia nessuno, perché sono scritte nel software? Tempi di risposta imposti da notifiche in-app, clienti assegnati e ritirati automaticamente, dashboard personali che misurano ciascuno contro soglie mai dichiarate compongono il «web of rules» della teoria di Dunlop, codificato nella piattaforma stessa.',
          '## L\'analisi',
          'I frames di Fox e la tipologia di Purcell e Sisson descrivono uno stile di gestione fortemente accentrato e individualista, in cui il conflitto non scompare ma cambia forma, diventando attrito passivo e abbandono. L\'analisi della voice (Marchington, Dundon) mostra canali solo diretti e superficiali, come survey e town hall informativi, senza alcuna rappresentanza, cioè la condizione che Morrison e Milliken chiamano silenzio organizzativo, in cui il management scambia il silenzio per soddisfazione. Sul piano dell\'engagement, il quadro di Kahn e la distinzione di Saks rivelano professionisti molto dedicati al lavoro clinico ma legati solo debolmente all\'organizzazione. Il contratto psicologico, letto con lo squilibrio sforzo-ricompensa di Siegrist, la giustizia organizzativa di Colquitt e la «valuta ideologica» di Thompson e Bunderson, mostra la ferita più profonda, perché per chi cura la violazione dei valori dichiarati (come nel caso pubblico di condivisione dei dati sanitari sanzionato dalla FTC) è un tradimento professionale prima che un inadempimento.',
          '## Il quadro giuridico',
          'L\'esposizione legale è stratificata e comprende la dottrina italiana dell\'etero-organizzazione (art. 2, D.lgs 81/2015, con la giurisprudenza sui riders), la Direttiva UE sul platform work con la sua presunzione di subordinazione, il Decreto Trasparenza sull\'obbligo di disclosure dei sistemi decisionali automatizzati e l\'art. 2087 del Codice civile sulla tutela dell\'integrità psicofisica. Nessuna di queste esposizioni è decisiva da sola, ed è il loro cumulo a rendere il modello fragile, sul piano giuridico oltre che su quello etico.',
          '## Le raccomandazioni',
          'Una tabella strategica collega ogni problema alla sua base teorica e a un\'azione concreta, cioè un forum consultivo elettivo dei clinici con accesso alle decisioni di piattaforma, KPI pubblicati e appellabili, una gestione dei conflitti riportata all\'interno con procedure scritte e mediazione, una supervisione clinica di supporto al posto del solo monitoraggio algoritmico e un audit del modello contrattuale secondo il principio «substance over form».',
          '## Cosa mi porto',
          'Mi porto l\'idea che nelle organizzazioni della cura il benessere dei professionisti non sia un tema HR tra gli altri, perché in fondo è il prodotto stesso, e che un terapeuta trattato come unità di servizio intercambiabile non possa offrire la qualità di presenza che la piattaforma stessa vende.'
        ],
        en: {
          kicker: 'Case study · Employment Relations & Employment Law',
          title: 'The therapist and the algorithm',
          ctaText: 'These are the themes I write and train on, alongside my clinical work. If you\'d like to exchange ideas, get in touch.',
          ctaLabel: 'Get in touch',
          body: [
            'A piece from the Strategic Employment Relations and Employment Law module (MSc Strategic HRM, Arden University). The organisation analysed (anonymised as "BestPsy") is a global online-therapy platform that engages around 30,000 therapists as independent contractors across more than twenty countries. The focus is the Italian operation: a standardised, algorithm-mediated model dropped into a context with no union and no collective bargaining.',
            '## The question',
            'What happens to employment relations when no one negotiates the rules, because they are written into the software? Response-time windows enforced by in-app prompts, clients allocated and withdrawn automatically, personal dashboards measuring each person against thresholds that are never disclosed: the "web of rules" of Dunlop\'s theory, encoded in the platform itself.',
            '## The analysis',
            'Fox\'s frames of reference and Purcell and Sisson\'s typology describe a strongly centralised, individualist management style in which conflict does not disappear: it changes form, becoming passive resistance and attrition. The analysis of voice (Marchington, Dundon) shows only direct, shallow channels (informational surveys and town halls) with no representation: the condition Morrison and Milliken call organisational silence, where management mistakes silence for satisfaction. On engagement, Kahn\'s framework and Saks\'s distinction reveal professionals highly committed to the clinical work but thinly attached to the organisation. And the psychological contract, read through Siegrist\'s effort-reward imbalance, Colquitt\'s organisational justice and Thompson and Bunderson\'s "ideological currency", shows the deepest wound: for those who care for others, the violation of declared values (as in the public case of health-data sharing sanctioned by the FTC) is not an ordinary breach, it is a professional betrayal.',
            '## The legal picture',
            'The legal exposure is layered: the Italian doctrine of hetero-organisation (art. 2, Legislative Decree 81/2015, with the case law on riders), the EU Platform Work Directive with its presumption of employment, the Transparency Decree on the duty to disclose automated decision systems, art. 2087 of the Civil Code on protecting psychophysical integrity. None of the exposures is decisive on its own; it is the accumulation that makes the model fragile, legally as well as ethically.',
            '## The recommendations',
            'A strategic table links each problem to its theoretical basis and a concrete action: an elected clinicians\' consultation forum with access to platform decisions, published and appealable KPIs, conflict management brought back in-house with written procedures and mediation, supportive clinical supervision in place of monitoring alone, and an audit of the contractor model against the "substance over form" principle.',
            '## What I take from it',
            'That in care organisations the wellbeing of the professionals is not one HR topic among others: it is the product. A therapist treated as an interchangeable service unit cannot offer the quality of presence the platform itself sells.'
          ]
        },
        es: {
          kicker: 'Caso de estudio · Employment Relations & Employment Law',
          title: 'El terapeuta y el algoritmo',
          ctaText: 'Estos son los temas sobre los que escribo y me formo, junto al trabajo clínico. Si quieres intercambiar ideas, escríbeme.',
          ctaLabel: 'Escríbeme',
          body: [
            'Trabajo del módulo Strategic Employment Relations and Employment Law (MSc Strategic HRM, Arden University). La organización analizada (anonimizada como "BestPsy") es una plataforma global de terapia online que contrata a unos 30.000 terapeutas como autónomos en más de veinte países. El foco es la operación italiana: un modelo estandarizado y mediado por el algoritmo, insertado en un contexto sin sindicato ni negociación colectiva.',
            '## La pregunta',
            '¿Qué le ocurre a las relaciones laborales cuando nadie negocia las reglas, porque están escritas en el software? Ventanas de tiempo de respuesta impuestas por notificaciones en la app, clientes asignados y retirados automáticamente, paneles personales que miden a cada uno contra umbrales nunca declarados: el "web of rules" de la teoría de Dunlop, codificado en la propia plataforma.',
            '## El análisis',
            'Los frames de Fox y la tipología de Purcell y Sisson describen un estilo de gestión fuertemente centralizado e individualista, en el que el conflicto no desaparece: cambia de forma, convirtiéndose en resistencia pasiva y abandono. El análisis de la voz (Marchington, Dundon) muestra solo canales directos y superficiales (encuestas y town halls informativos) sin representación alguna: la condición que Morrison y Milliken llaman silencio organizativo, donde la dirección confunde el silencio con la satisfacción. En el plano del compromiso, el marco de Kahn y la distinción de Saks revelan profesionales muy dedicados al trabajo clínico pero débilmente ligados a la organización. Y el contrato psicológico, leído con el desequilibrio esfuerzo-recompensa de Siegrist, la justicia organizativa de Colquitt y la "moneda ideológica" de Thompson y Bunderson, muestra la herida más profunda: para quien cuida, la violación de los valores declarados (como en el caso público de compartición de datos sanitarios sancionado por la FTC) no es un incumplimiento cualquiera, es una traición profesional.',
            '## El marco jurídico',
            'La exposición legal es estratificada: la doctrina italiana de la hetero-organización (art. 2, Decreto Legislativo 81/2015, con la jurisprudencia sobre los riders), la Directiva de la UE sobre trabajo en plataformas con su presunción de laboralidad, el Decreto de Transparencia sobre el deber de informar de los sistemas de decisión automatizados, el art. 2087 del Código Civil sobre la tutela de la integridad psicofísica. Ninguna de las exposiciones es decisiva por sí sola; es la acumulación la que vuelve frágil el modelo, jurídica además de éticamente.',
            '## Las recomendaciones',
            'Una tabla estratégica vincula cada problema con su base teórica y una acción concreta: un foro consultivo electo de los clínicos con acceso a las decisiones de la plataforma, KPI publicados y recurribles, gestión de conflictos devuelta a lo interno con procedimientos escritos y mediación, supervisión clínica de apoyo en lugar del mero seguimiento algorítmico, y una auditoría del modelo contractual según el principio de "substance over form".',
            '## Lo que me llevo',
            'Que en las organizaciones del cuidado el bienestar de los profesionales no es un tema de RR. HH. entre otros: es el producto. Un terapeuta tratado como una unidad de servicio intercambiable no puede ofrecer la calidad de presencia que la propia plataforma vende.'
          ]
        }
      }
    };

    const articleModal = document.getElementById('article-modal');
    const articleKicker = document.getElementById('article-modal-kicker');
    const articleTitle = document.getElementById('article-modal-title');
    const articleBody = document.getElementById('article-modal-body');
    let lastFocusedEl = null;
    let currentArticleId = null;
    let currentBuyHref = null;
    // Link interno della CTA (es. la pagina di una guida gratuita).
    // Diverso da buyHref: resta sul sito e apre nella stessa scheda.
    let currentCtaHref = null;

    // Note mostrate in cima al modale quando il contenuto lungo non è ancora
    // tradotto nella lingua attiva (l'italiano resta il testo integrale).
    const ARTICLE_LANG_NOTE = {
      en: 'This in-depth article is currently available in Italian only.',
      es: 'Este artículo en profundidad está disponible por ahora solo en italiano.'
    };

    function openArticle(id) {
      const base = articles[id];
      if (!base) { return; }
      currentArticleId = id;
      const lang = (window.SiteI18N && window.SiteI18N.lang) || 'it';
      // Usa la variante tradotta se esiste (es. i case study), altrimenti l'italiano
      const art = (lang !== 'it' && base[lang]) ? base[lang] : base;
      const untranslated = (lang !== 'it' && !base[lang]);
      lastFocusedEl = document.activeElement;
      articleModal.setAttribute('lang', untranslated ? 'it' : lang);
      articleKicker.textContent = art.kicker;
      articleTitle.textContent = art.title;
      articleBody.innerHTML = '';
      if (untranslated && ARTICLE_LANG_NOTE[lang]) {
        const note = document.createElement('p');
        note.className = 'text-xs text-inchiostro/55 italic border-l-2 border-mirtillo pl-3';
        note.textContent = ARTICLE_LANG_NOTE[lang];
        articleBody.appendChild(note);
      }
      art.body.forEach(function (paragraph) {
        // Le righe che iniziano con "## " diventano sottotitoli (usati nei case study)
        if (paragraph.indexOf('## ') === 0) {
          const h = document.createElement('h4');
          h.className = 'font-serif text-xl text-notte pt-3';
          h.textContent = paragraph.slice(3);
          articleBody.appendChild(h);
        } else {
          const p = document.createElement('p');
          p.textContent = paragraph;
          articleBody.appendChild(p);
        }
      });
      // CTA personalizzabile per tipo di contenuto (articoli, case study, compendi a pagamento)
      const defText = (window.SiteI18N && window.SiteI18N.t('art.cta.text.default')) || 'Ti sei riconosciuto in queste righe? Possiamo partire da qui.';
      const defLabel = (window.SiteI18N && window.SiteI18N.t('art.cta.default')) || 'Prenota un primo colloquio';
      document.getElementById('article-cta-text').textContent = art.ctaText || defText;
      document.getElementById('article-cta-label').textContent = art.ctaLabel || defLabel;
      // Se l'articolo ha un link d'acquisto (compendi/guide a pagamento), la CTA
      // diventa un pulsante che apre Gumroad; altrimenti scorre ai contatti.
      currentBuyHref = art.buyHref || null;
      currentCtaHref = art.ctaHref || null;
      const ctaIcon = document.getElementById('article-cta-icon');
      ctaIcon.setAttribute('data-lucide',
        currentBuyHref ? 'shopping-cart' : (currentCtaHref ? 'gift' : 'calendar-heart'));
      articleModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      articleModal.scrollTop = 0;
      disegnaIcone();
      document.getElementById('article-close').focus();
    }

    function closeArticle() {
      articleModal.classList.add('hidden');
      document.body.style.overflow = '';
      if (lastFocusedEl) { lastFocusedEl.focus(); }
    }

    document.querySelectorAll('.article-open').forEach(function (btn) {
      btn.addEventListener('click', function () { openArticle(btn.dataset.article); });
    });
    document.getElementById('article-close').addEventListener('click', closeArticle);
    document.getElementById('article-overlay').addEventListener('click', closeArticle);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !articleModal.classList.contains('hidden')) { closeArticle(); }
    });
    document.getElementById('article-cta').addEventListener('click', function () {
      // Compendi/guide a pagamento: apri Gumroad in una nuova scheda.
      if (currentBuyHref) {
        window.open(currentBuyHref, '_blank', 'noopener');
        return;
      }
      if (currentCtaHref) {
        window.location.href = currentCtaHref;
        return;
      }
      closeArticle();
      // Nella home il modulo è in pagina; altrove (es. /colleghi/) ci si va.
      const contatti = document.getElementById('contatti');
      if (contatti) { contatti.scrollIntoView({ behavior: 'smooth' }); }
      else { window.location.href = '/#contatti'; }
    });

    // Filtra le card dei compendi in base all'attributo data-langs.
    function filterCompendi(lang) {
      const cards = document.querySelectorAll('#compendi .compendi-card');
      if (!cards.length) { return; }
      let visible = 0;
      cards.forEach(function (card) {
        const langs = (card.getAttribute('data-langs') || '').split(/\s+/);
        const show = langs.indexOf(lang) !== -1;
        card.classList.toggle('hidden', !show);
        if (show) { visible++; }
      });
      // Se per questa lingua non c'è nessuna pubblicazione, nascondi la sezione
      // e le relative voci di menu.
      const section = document.getElementById('compendi');
      if (section) { section.classList.toggle('hidden', visible === 0); }
      document.querySelectorAll('[data-target="compendi"], a[href="#compendi"]').forEach(function (link) {
        const li = link.closest('li') || link;
        li.classList.toggle('hidden', visible === 0);
      });
    }

    if (window.SiteI18N) {
      window.SiteI18N.onChange(function (lang) {
        // Articolo aperto: lo ricarica nella lingua scelta
        if (currentArticleId && !articleModal.classList.contains('hidden')) {
          openArticle(currentArticleId);
        }
        filterCompendi(lang);
      });
      filterCompendi(window.SiteI18N.lang);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
