/* ============================================================
   i18n.js — internazionalizzazione del sito (IT / EN / ES)
   ------------------------------------------------------------
   L'italiano è la lingua di default: vive direttamente nell'HTML
   ed è il fallback. Le traduzioni EN/ES stanno nel dizionario
   qui sotto, indicizzate dalla chiave `data-i18n` degli elementi.
   Se una chiave manca, l'elemento resta in italiano: il sito
   non si rompe mai, nemmeno con traduzioni parziali.

   Contenuti dinamici (stepper, articoli, test) NON usano questo
   dizionario: espongono i propri testi tradotti e leggono la
   lingua attiva da window.SiteI18N.lang.
   ============================================================ */
(function () {
  'use strict';

  var LANGS = ['it', 'en', 'es'];

  /* ----------------------------------------------------------
     DIZIONARIO
     Chiavi organizzate per sezione. I valori possono contenere
     HTML inline (es. <strong>). L'italiano non è qui: è nell'HTML.
     ---------------------------------------------------------- */
  var DICT = {
    en: {
      /* --- Meta / html lang --- */
      'html.lang': 'en',

      /* --- Navbar --- */
      'nav.chisono': 'About',
      'nav.servizi': 'Services',
      'nav.test': 'Free tests',
      'nav.portfolio': 'Portfolio',
      'nav.articoli': 'Articles',
      'nav.primocolloquio': 'First session',
      'nav.lang.aria': 'Site language',

      /* Dropdown servizi */
      'svc.terapia.t': 'Individual & couples therapy',
      'svc.terapia.d': 'Approach and Demand Analysis',
      'svc.expat.t': 'Italians abroad',
      'svc.expat.d': 'Online therapy in Italian',
      'svc.superv.t': 'Clinical supervision',
      'svc.superv.d': 'For psychologists, therapists & teams',
      'svc.psicovoice.t': 'PsicoVoice',
      'svc.psicovoice.d': 'The web app for psychologists',

      /* Menu mobile */
      'm.group.percorsi': 'Therapy paths',
      'm.group.colleghi': 'For colleagues',
      'm.group.approfondisci': 'Explore more',
      'm.chisono': 'About',
      'm.approccio': 'Approach & therapy',
      'm.expat': 'Italians abroad',
      'm.test': 'Free tests',
      'm.superv': 'Clinical supervision',
      'm.psicovoice': 'PsicoVoice',
      'm.percorso': 'Experience & CV',
      'm.portfolio': 'Portfolio & case studies',
      'm.articoli': 'Resources & articles',
      'm.email': 'Email',
      'm.whatsapp': 'WhatsApp',
      'm.cta': 'Book a first session',
      'm.lang.label': 'Language',

      /* --- Hero --- */
      'hero.badge': 'Online therapy across Italy and for Italians abroad · Office in Itri (LT)',
      'hero.title': 'Every request for help already contains a direction.<br><span class="text-mirtillo-600">Together we can decode it.</span>',
      'hero.p1': 'I\'m <strong>Alberto Del Bove</strong>, an <strong>online psychologist</strong> and psychoanalytic psychotherapist, specialised in <strong>Demand Analysis</strong>. I follow online paths across Italy and from abroad, and in person in Itri (LT).',
      'hero.p2': 'Alongside clinical practice I bring years of experience in digital mental health as a Clinical Team Lead and Clinical Operations Manager, and I\'m the Founder of <strong>PsicoVoice</strong>. I know first-hand the struggle of going through hard times, at work and beyond.',
      'hero.cta1': 'Start your path',
      'hero.cta2': 'Couples path',
      'hero.testlink': 'Not sure where to start? Take a free 2-minute test',
      'hero.badge1': 'Lazio Psychologists\' Board no. 23754',
      'hero.badge2': 'Specialisation SPS Rome, 2022',
      'hero.badge3': 'IT · EN · ES',
      'hero.figcaption': 'A first exploratory session: a space to understand together what you need.',

      /* --- Teaser test --- */
      'teaser.kicker': 'Free · anonymous · 2-3 minutes · with PDF report',
      'teaser.title': 'Four tests to start understanding yourself better.',
      'teaser.chip.personalita': 'Personality',
      'teaser.chip.carico': 'Workload',
      'teaser.chip.adhd': 'Attention & impulsivity',
      'teaser.chip.domanda': 'Your demand',
      'teaser.cta': 'Take a free test',

      /* --- Chi sono --- */
      'chi.kicker': 'About',
      'chi.title': 'A story in listening: <br>between clinic, people and organisations',
      'chi.p1': 'My path begins at <strong>Sapienza University of Rome</strong>, where I graduated in Clinical Psychology after a bachelor\'s in Psychological Sciences. Since <strong>2018</strong> I\'ve been a licensed psychologist and immediately started working on two fronts: private clinical practice and coordinating projects in social-health organisations, where I learned that people\'s distress never lives in a vacuum, but within precise relationships, contexts and organisational cultures.',
      'chi.p2': 'In <strong>2022</strong> I completed the four-year specialisation school in <strong>Psychoanalytic Psychotherapy at SPS in Rome</strong>, training in <strong>Demand Analysis</strong>: an approach that isn\'t satisfied with the symptom, but explores the meaning of the request for help within the history and contexts of the person who brings it.',
      'chi.p3': 'In those same years my career took a direction few therapists follow: at <strong>Unobravo</strong> I was <strong>Clinical Team Lead, psychotherapist and CME trainer</strong>, guiding the clinical team through a phase of extraordinary growth, balancing quality, retention and therapist engagement. Then, at <strong>BetterHelp</strong> — the world\'s largest online therapy platform — I worked as <strong>Clinical Operations Manager</strong> for the European markets.',
      'chi.p4': 'From this dual experience came <strong>PsicoVoice</strong>, the practice-management and billing software for psychologists that I founded: the point where my clinical soul meets my digital and managerial one.',
      'chi.quote': 'Why does all this matter to you? Because when you talk to me about burnout, a difficult boss, a job that drains you or a career abroad, I don\'t have to imagine that world: I\'ve worked inside it, every day.',
      'chi.link': 'If you recognise yourself in these words, let\'s talk: book a first session',
      'chi.stat1': 'years of clinical practice',
      'chi.stat2': 'working languages',
      'chi.stat3': 'settings: online and in person',

      /* --- Approccio --- */
      'app.kicker': 'Therapeutic approach',
      'app.title': 'Demand Analysis: <br>starting from what you ask, not only from what you feel',
      'app.intro': 'When someone asks for help, they bring much more than a symptom: they bring a story, relationships, a context. The psychoanalytic approach based on <strong>Demand Analysis</strong> works exactly there — on the meaning that anxiety, blocks or fatigue take on <em>in your life</em>, to turn suffering into understanding and understanding into the possibility of growth.',
      'app.c1.t': 'Listening to the demand',
      'app.c1.d': 'The first task isn\'t to give answers, but to understand together what you\'re really asking: of yourself, of others, of your life contexts. Often this is where change begins.',
      'app.c2.t': 'The person in their contexts',
      'app.c2.d': 'Family, couple, work: symptoms speak the language of the relationships we live in. We work on the relationship between you and your systems of belonging, not on a diagnostic label.',
      'app.c3.t': 'From understanding to growth',
      'app.c3.d': 'The goal isn\'t just to feel better, but to gain tools to read situations, manage relationships and build growth paths that stay yours even after therapy.',
      'app.online.badge': 'My main setting',
      'app.online.t': 'Online therapy',
      'app.online.d': 'I\'ve worked online for years, with hundreds of paths followed through the main digital therapy platforms. The online setting, if done with method, has the same depth as the analyst\'s room — with a few extra advantages:',
      'app.online.li1': 'Continuity: therapy follows you even if you move, travel or live abroad',
      'app.online.li2': 'Flexible scheduling, designed also for those with intense work rhythms',
      'app.online.li3': 'The comfort of a space of your own, which often makes it easier to open up',
      'app.online.li4': 'No time lost commuting: more energy for the therapeutic work',
      'app.online.cta': 'Book an online session',
      'app.studio.badge': 'In person',
      'app.studio.t': 'The Itri (LT) office',
      'app.studio.d': 'For those who prefer meeting in person, I see clients at my office at <strong>Via Luigi Pirandello 8, Itri</strong>, a point of reference also for Formia, Gaeta, Fondi and the southern Pontine area.',
      'app.studio.li1': 'Individual paths for adults and young adults',
      'app.studio.li2': 'Counselling and support for couples and families',
      'app.studio.li3': 'Possibility of mixed formats: office + online',
      'app.studio.cta': 'Book an in-person session',

      /* --- Primo colloquio --- */
      'pc.kicker': 'No leap in the dark',
      'pc.title': 'How the first session works',
      'pc.intro': 'Four steps, no commitment: knowing what to expect is already part of taking care of yourself.',
      'pc.tab0': 'You write to me',
      'pc.tab1': 'I reply',
      'pc.tab2': 'We get to know each other',
      'pc.tab3': 'We decide together',
      'pc.cta': 'Take the first step',
      'pc.note': 'The first session is exploratory and doesn\'t commit you to continuing.',

      /* --- Expat --- */
      'expat.kicker': 'Italians abroad',
      'expat.title': 'Online psychotherapy for Italians living abroad',
      'expat.p1': 'Living in another country is an experience that transforms you — and one that sometimes tests you more than you\'d imagine: homesickness, a sense of uprooting, relationships to rebuild, a professional identity to redefine. And when the time comes to ask for help, doing it <strong>in a language that isn\'t yours</strong> can make everything harder.',
      'expat.p2': 'Psychotherapy works with nuance: with the exact words of your story, with the sayings of home, with what stays unspoken. That\'s why, for many Italians abroad, being able to do therapy <strong>in your mother tongue</strong> isn\'t a detail: it\'s the condition for the therapeutic work to go deep.',
      'expat.p3': 'I\'ve lived and worked between <strong>Italy and Spain</strong> and for years I operated in international, remote-first organisations: I know first-hand the struggles and resources of expat life. Online sessions adapt to your time zone and follow you wherever your path takes you.',
      'expat.tag1': 'Sessions in Italian, wherever you are',
      'expat.tag2': 'Flexible hours in your time zone',
      'expat.tag3': 'First-hand experience of expat life',
      'expat.cta': 'Write to me from where you are',

      /* --- Test section --- */
      'test.kicker': 'Free interactive tools',
      'test.title': 'Four tests to start understanding yourself better',
      'test.intro': 'Four short self-observation tools, built with clinical criteria: personality, the real weight of work, attention and impulsivity, and what you\'re truly looking for. <strong>Free, anonymous, no sign-up</strong> — your answers never leave your device.',
      'test.card1.badge': 'Most loved',
      'test.card1.t': 'What psychological type are you?',
      'test.card1.d': '9 questions inspired by C.G. Jung to discover where you find energy, how you read the world and how you decide. 8 profiles, with strengths and room to grow — no labels.',
      'test.card1.time': '3 minutes',
      'test.card1.q': '9 questions',
      'test.card2.badge': 'For those who overwork',
      'test.card2.t': 'How much is work costing you?',
      'test.card2.d': '8 concrete situations to measure your level of wear: energy, detachment, recovery. A clear score out of 24, four reading bands and the signals not to ignore.',
      'test.card2.time': '2 minutes',
      'test.card2.q': '8 questions',
      'test.card3.badge': 'The deepest',
      'test.card3.t': 'What are you really asking for?',
      'test.card3.d': '5 questions inspired by Demand Analysis to bring into focus the area of your life asking for attention: relationships, work, identity or direction.',
      'test.card3.time': '2 minutes',
      'test.card3.q': '5 questions',
      'test.card4.badge': 'New',
      'test.card4.t': 'Attention and impulsivity: how much do they weigh?',
      'test.card4.d': '10 everyday situations inspired by adult ADHD screening questionnaires. It\'s not a diagnosis: it\'s a lead to understand whether it\'s worth exploring with a professional.',
      'test.card4.time': '3 minutes',
      'test.card4.q': '10 questions',
      'test.start': 'Start the test',
      'test.alltests': 'All tests',
      'test.back': 'Previous question',
      'test.result.disclaimer': 'This tool offers food for self-observation: it\'s not a diagnostic test and doesn\'t replace a professional assessment.',
      'test.download': 'Download the PDF report',
      'test.result.share.q': 'Want to put words to this result? Book a session and share it with me: it\'ll be a great starting point.',
      'test.result.share.cta': 'Book and share the result',
      'test.restart': 'Retake this test',
      'test.other': 'Try another test',
      'test.faq.title': 'Frequently asked questions about the tests',
      'test.faq1.q': 'Are these tests a psychological diagnosis?',
      'test.faq1.a': 'No. They\'re self-observation tools built with clinical criteria, meant to spark reflection — not to classify you. A real assessment can only come from meeting a professional: if a result strikes you, the first session is the right place to explore it.',
      'test.faq2.q': 'Where do my answers end up?',
      'test.faq2.a': 'Nowhere: the tests run entirely in your browser. Answers are not saved, tracked or sent — only you see the result, and you decide whether to share it with me in the contact form.',
      'test.faq3.q': 'How long do they take and how much do they cost?',
      'test.faq3.a': 'Two to three minutes each, and they\'re completely free. You can retake them as often as you like: even watching how your answers change over time is interesting information.',
      'test.faq4.q': 'What do I do with the result?',
      'test.faq4.a': 'You can keep it for yourself as food for thought, or share it with me in one click: the button under each result pre-fills the contact form. In the first session we\'ll start from there — from what the test stirred, more than from the score itself.',

      /* --- Percorso / CV --- */
      'perc.kicker': 'Experience & CV',
      'perc.title': 'The stages of a dual path',
      'perc.intro': 'From the present to the roots: on one side clinical and organisational work, on the other a training that never stopped.',
      'perc.lavoro.h': 'Professional experience',
      'perc.form.h': 'Education',
      'perc.today': 'Today',
      'perc.inprogress': 'In progress',
      'perc.l1.h': 'Founder',
      'perc.l1.d': 'PsicoVoice is the practice-management and billing software for psychologists that I founded: the meeting point between my clinical soul and my digital, managerial one.',
      'perc.l2.h': 'Clinical Operations Manager (EU)',
      'perc.l2.d': 'At the world\'s largest online therapy platform I contributed to clinical quality and operations across the European markets: professional selection, service standards and regulatory compliance.',
      'perc.l3.h': 'Clinical Team Lead, psychotherapist and CME trainer',
      'perc.l3.d': 'At the leading Italian online-psychology platform I contributed to clinical quality, retention and engagement of the therapist team, overseeing their selection, development and accredited CME training.',
      'perc.l4.date': 'Since 2018 · Private practice',
      'perc.l4.h': 'Psychologist and Psychotherapist',
      'perc.l4.d': 'Psychotherapy paths online and in person, between Italy and Spain, with adults, couples and families.',
      'perc.l5.date': '2018 – 2021 · Social-health organisations',
      'perc.l5.h': 'Psychologist & Project Manager',
      'perc.l5.d': 'Coordinating inclusion and employability programmes, skills assessment and management of multidisciplinary teams in residential and community settings.',
      'perc.f1.date': 'Since January 2026 · Arden University (UK)',
      'perc.f1.h': 'MSc in Strategic Human Resource Management (CIPD Level 7)',
      'perc.f1.d': 'CIPD-, CMI-, SHRM- and HRCI-accredited master\'s: talent and reward, people analytics, employment relations and labour law, wellbeing and performance, organisational development and change. Affiliate Member of the Chartered Management Institute (CMI).',
      'perc.f1.link': 'See three case studies from the Master\'s',
      'perc.f2.h': 'Specialisation in Psychoanalytic Psychotherapy',
      'perc.f2.d': 'Four-year school oriented to Demand Analysis: the approach that guides all my clinical work.',
      'perc.f3.h': 'Licence and registration with the Board (no. 23754)',
      'perc.f3.d': 'Psychologist licensed to practise since 26 March 2018.',
      'perc.f4.h': 'Master\'s degree in Clinical Psychology',
      'perc.f5.h': 'Bachelor\'s degree in Psychological Sciences',
      'perc.skills.clin': 'Clinical skills',
      'perc.skills.mgr': 'Managerial skills',
      'perc.story': 'This is my story. <span class="text-mirtillo-700">The first session is for you to tell me yours.</span>',
      'perc.story.cta': 'Book a first session',

      /* --- Supervisione --- */
      'sup.kicker': 'For psychologists, therapists & teams',
      'sup.title': 'Clinical supervision: a third space to think about your work',
      'sup.p1': 'Supervision isn\'t a check on your work, nor a place to receive the "right answer". It\'s a <strong>third space</strong> in which to stop and think together about a case, a therapeutic relationship, an impasse — and rediscover the freedom to move when clinical work becomes dense, confusing or too heavy.',
      'sup.p2': 'Often what we call "difficulty with a patient" is really a <strong>question the case addresses to us</strong>: to our way of listening, to our blind spots, to the contexts we work in. Supervision exists precisely to put words to that question.',
      'sup.model.label': 'How I run them: Demand Analysis applied to supervision',
      'sup.c1.t': 'The case and its demand',
      'sup.c1.d': 'We start from the clinical material you bring — sessions, dreams, moments of stalemate — to focus on what the patient is really asking, of themselves and of you, beyond the stated symptom.',
      'sup.c2.t': 'The relationship and countertransference',
      'sup.c2.d': 'What you feel in session — boredom, irritation, protectiveness, urgency — isn\'t a disturbance to correct but a tool of knowledge. We learn to read it as information about the case.',
      'sup.c3.t': 'The context and the institution',
      'sup.c3.d': 'No case lives in a vacuum: service, platform, budget, mandate. Having led clinical teams in digital mental-health companies, I bring a view on the organisational dynamics you work in too.',
      'sup.online.t': 'Online',
      'sup.online.d': 'By video call, wherever you practise. I\'ve supervised and trained therapists remotely for years: the online setting, held with method, has the same density as in person.',
      'sup.studio.t': 'In person',
      'sup.studio.d': 'At the Itri (LT) office, for those who prefer meeting in person or for periodic supervision cycles, also in a mixed format with online sessions.',
      'sup.formats.t': 'Available formats',
      'sup.formats.li1.b': 'Individual',
      'sup.formats.li1.d': '— a path on your cases and your clinical style, for newly registered or experienced colleagues.',
      'sup.formats.li2.b': 'Group',
      'sup.formats.li2.d': '— small peer intervision groups, where one person\'s case becomes everyone\'s thinking.',
      'sup.formats.li3.b': 'For teams and services',
      'sup.formats.li3.d': '— institutional supervision for clinical teams, cooperatives and platforms.',
      'sup.cta': 'Request a supervision',

      /* --- Risorse / Articoli --- */
      'ris.kicker': 'Resources & Articles',
      'ris.title': 'Starting points for reflection',
      'ris.intro': 'Short reads on themes I meet every day, in therapy and in organisations.',
      'ris.readmore': 'Read the article',
      'ris.a1.cat': 'Work & wellbeing',
      'ris.a1.t': 'Burnout: when it\'s the context asking too much of you',
      'ris.a1.d': 'Burnout isn\'t a personal weakness: it\'s a sick relationship between person and organisation. Recognising the early signs — cynicism, exhaustion, detachment — is the first step to not normalising them.',
      'ris.a2.cat': 'Anxiety',
      'ris.a2.t': 'Anxiety isn\'t an enemy: it\'s a message to translate',
      'ris.a2.d': 'Panic attacks and generalised anxiety are frightening, but they rarely come "out of nowhere". They often signal a conflict between what we live and what we desire: listening to them is more useful than fighting them.',
      'ris.a3.cat': 'Demand Analysis',
      'ris.a3.t': '"What am I really asking for?" The power of understanding your own demand',
      'ris.a3.d': 'Behind "I want to stop feeling bad" there\'s always a more precise request: to be seen, to change a relationship, to find a direction again. Therapy begins when that demand finds its words.',
      'ris.a4.cat': 'Attention & trauma',
      'ris.a4.t': 'Adult ADHD: what if distraction were also a protection?',
      'ris.a4.d': 'Not all inattention has the same story. In psychoanalytic terms, being distracted and never stopping can also be a way not to feel: understanding what one is distracted from changes the course of care.',
      'ris.a5.cat': 'Living abroad',
      'ris.a5.t': 'Therapy in your mother tongue: why the words of home reach deeper',
      'ris.a5.d': 'You can live perfectly well in a second language — and realise that, when it comes to saying pain, foreign words don\'t weigh. The unconscious has an accent: in therapy it makes the difference.',
      'ris.a6.cat': 'Living abroad',
      'ris.a6.t': 'Living elsewhere: the invisible fatigue of those who leave',
      'ris.a6.d': 'Expatriation is told as an adventure, but it\'s also a silent grief: language, rituals, belonging. Naming this fatigue is the first step to truly inhabiting the place you chose to live.',
      'ris.a7.cat': 'About me',
      'ris.a7.t': 'Why I do this job (and why in two worlds)',
      'ris.a7.d': 'Psychotherapist and People Manager: two words that seem distant and that, in my story, have always spoken to each other. A personal account of how I got here.',

      /* --- Portfolio --- */
      'pf.kicker': 'Portfolio · MSc Strategic HRM',
      'pf.title': 'Three case studies across people, organisations and data',
      'pf.intro': 'Since January 2026 I\'ve been studying <strong>Strategic Human Resource Management</strong> (MSc, CIPD Level 7) at Arden University. These three academic projects show the other half of how I see things: I read organisations — platforms, teams, data — with the same critical attention I bring to listening to people in therapy.',
      'pf.c1.kicker': 'Strategic Planning & Ethics',
      'pf.c1.t': 'One mission, two workforces',
      'pf.c1.d': 'An Italian digital mental-health platform: 300 employees and 7,000 self-employed professionals. The model holds on paper — but a restructuring run at two speeds and a decision that was never explained show where strategy and ethics part ways.',
      'pf.c1.chip3': 'Carroll\'s CSR',
      'pf.c1.chip4': 'Ethical lenses',
      'pf.c1.meta1': 'Academic report',
      'pf.c1.meta2': '6 min read',
      'pf.c2.kicker': 'People Analytics',
      'pf.c2.t': 'The data a company watches — and the data it never collects',
      'pf.c2.d': 'A global SaaS company, 370 people across twelve countries: performance is measured every month, but no one collects engagement, reasons for leaving, or training ROI. An analysis of how people data becomes value — or stays mere control.',
      'pf.c2.chip2': 'Ulrich\'s model',
      'pf.c2.chip4': 'Stakeholder theory',
      'pf.c2.meta1': 'Presentation + podcast',
      'pf.c2.meta2': '5 min read',
      'pf.c3.kicker': 'Employment Relations & Law',
      'pf.c3.t': 'The therapist and the algorithm',
      'pf.c3.d': 'A global online-therapy platform, 30,000 contractor therapists: no one negotiates the rules of work, because they\'re written into the software. Industrial relations, voice and the psychological contract where management is an algorithm — and what Italian and EU law have to say.',
      'pf.c3.chip1': 'Dunlop\'s system',
      'pf.c3.chip3': 'Psychological contract',
      'pf.c3.meta1': 'Academic report',
      'pf.c3.meta2': '6 min read',
      'pf.readcs': 'Read the case study',
      'pf.disclaimer': 'The three pieces were written as Master\'s assessments and are summarised here in accessible form. The organisations analysed are anonymised, as in the originals; data and episodes cited come from the assessments themselves and from public sources.',

      /* --- Compendi & Guide (pubblicazioni a pagamento) --- */
      'nav.compendi': 'Compendia',
      'm.compendi': 'Compendia & Guides',
      'comp.kicker': 'Compendia & Guides',
      'comp.title': 'In-depth clinical writing, meant to be read in full',
      'comp.intro': 'Every week I publish new compendia and guides: long, carefully written texts for those who want to go deep. Here you\'ll find a free excerpt of each; the full text is available on Gumroad.',
      'comp.c1.badge': 'For therapists',
      'comp.c1.t': 'Adult ADHD: a psychodynamic reading',
      'comp.c1.d': 'A compendium for psychodynamically oriented psychotherapists who meet adult patients with ADHD, without reducing the person to their executive functioning.',
      'comp.c2.badge': 'For those living with ADHD',
      'comp.c2.t': 'Adult ADHD: a guide to understanding yourself',
      'comp.c2.d': 'A guide for adults with ADHD (or who suspect they have it): clear words to understand yourself, stories to recognise yourself in, strategies on your side.',
      'comp.c3.badge': 'For clinicians',
      'comp.c3.t': 'Adult ADHD: a psychodynamic compendium',
      'comp.c3.d': 'The English edition of the compendium for clinicians: the same psychodynamic reading of adult ADHD, written for colleagues who work in English.',
      'comp.readexcerpt': 'Read the excerpt',
      'comp.buy': 'Buy on Gumroad',
      'comp.note': 'The excerpts published here are a small preview: the full text, with every chapter, is reserved for those who buy the publication on Gumroad.',

      /* --- PsicoVoice --- */
      'pv.kicker': 'A project I founded · for fellow psychologists',
      'pv.title': 'The web app that simplifies invoices and patient management',
      'pv.p': 'I created <strong class="text-white">PsicoVoice</strong> to free psychologists and psychotherapists from bureaucracy: invoicing, cash-basis VAT, patient and appointment management in a single tool, designed by someone who knows the profession from the inside.',
      'pv.cta': 'Discover PsicoVoice · www.psicovoice.it',
      'pv.li1': 'Invoicing and cash-basis VAT without the headache',
      'pv.li2': 'Tidy patient records and files',
      'pv.li3': 'Appointments and reminders at a glance',
      'pv.li4': 'Tailored to the psychology profession',

      /* --- Contatti --- */
      'con.kicker': 'Contact & Location',
      'con.title': 'The first step is a question',
      'con.intro': 'This isn\'t a diagnostic questionnaire: it\'s the first space where your demand is heard. Tell me what you like, however it comes. <strong>I\'ll get back to you within 24–48 hours</strong> to arrange a first exploratory session, online or in person.',
      'con.f.nome': 'Full name',
      'con.f.nome.ph': 'Your name',
      'con.f.email': 'Email',
      'con.f.email.ph': 'name@example.com',
      'con.f.tel': 'Phone',
      'con.f.tel.opt': '(optional)',
      'con.f.setting': 'Setting preference',
      'con.f.setting.online': 'Online',
      'con.f.setting.studio': 'In person in Itri (LT)',
      'con.f.setting.nonso': 'Not sure yet',
      'con.f.temi.legend': 'What would you like to talk about?',
      'con.f.temi.help': 'Select one or more themes, only if you like: it helps me welcome you better, it\'s not required.',
      'con.f.tema.ansia': 'Anxiety / Panic attacks',
      'con.f.tema.burnout': 'Work stress / Burnout',
      'con.f.tema.rel': 'Relationship difficulties',
      'con.f.tema.crescita': 'Personal growth',
      'con.f.tema.orient': 'Career guidance',
      'con.f.tema.estero': 'I live abroad',
      'con.f.tema.coppia': 'Couples path',
      'con.f.tema.superv': 'Clinical supervision (for colleagues)',
      'con.f.temi.feedback': 'Thank you: we\'ll start from here.',
      'con.f.msg': 'Your message',
      'con.f.msg.ph': 'Write freely: what brings you here, for how long, what you\'d like to change…',
      'con.f.send.email': 'Send via Email',
      'con.f.send.wa': 'Message me on WhatsApp',
      'con.f.copy': 'Or copy the message',
      'con.f.copy.and': 'and send it however you prefer',
      'con.f.privacy': 'Your data is used only to get back to you and is treated confidentially, respecting professional secrecy and the GDPR.',
      'con.info.t': 'Direct contacts',
      'con.info.email': 'Email',
      'con.info.tel': 'Phone / WhatsApp',
      'con.info.studio': 'Office',
      'con.map.note': 'The office is in Itri, in the province of Latina, easily reached from Formia, Gaeta, Fondi, Sperlonga and the whole southern Pontine area.',
      'con.online.t': 'Online mode',
      'con.online.d': 'Online sessions take place by video call on secure platforms, with the same confidentiality as the office. Availability in extended time slots, also for those in a different time zone.',
      'con.faq.title': 'Frequently asked questions about the path',
      'con.faq1.q': 'How much does a session cost?',
      'con.faq1.a': 'The cost is defined clearly at first contact, before we begin: no surprises. The first exploratory session serves this too — understanding together what you need and agreeing costs and frequency transparently.',
      'con.faq2.q': 'How long is a session and how often do we meet?',
      'con.faq2.a': 'A session usually lasts about 50 minutes. The frequency — usually weekly — isn\'t an imposed rule: we define it together based on what you bring and the phase of the path.',
      'con.faq3.q': 'How does an online session work, in practice?',
      'con.faq3.a': 'We connect by video call on a secure platform, at the agreed time. You only need a stable connection and a private space to speak freely. Confidentiality is the same as in the office, guaranteed by professional secrecy.',
      'con.faq4.q': 'What\'s the difference between a psychologist and a psychotherapist?',
      'con.faq4.a': 'A psychologist holds a psychology degree and is licensed by the Board; a psychotherapist additionally holds a four-year specialisation that qualifies them to treat with psychotherapy. I\'ve been a psychologist since 2018 and a psychoanalytic psychotherapist, specialised at SPS in Rome in 2022.',
      'con.faq5.q': 'Does what I say stay between us?',
      'con.faq5.a': 'Yes. Everything that emerges in session is protected by professional secrecy, to which I\'m bound by law and ethics. Your contact data too is treated in compliance with the GDPR, only to get back to you.',
      'con.faq6.q': 'Are the sessions tax-deductible?',
      'con.faq6.a': 'Yes: psychotherapy sessions are healthcare services and the invoice is deductible as a medical expense in your tax return, under current rules. You\'ll receive a proper invoice for every session.',

      /* --- Footer --- */
      'foot.role': 'Psychologist Psychotherapist · Specialist in Demand Analysis',
      'foot.board': 'Registered with the Lazio Psychologists\' Board no. 23754 (since 2018)',
      'foot.nav.chisono': 'About',
      'foot.nav.approccio': 'Approach',
      'foot.nav.expat': 'Italians abroad',
      'foot.nav.portfolio': 'Portfolio',
      'foot.nav.psicovoice': 'PsicoVoice',
      'foot.nav.contatti': 'Contact',
      'foot.rights': 'All rights reserved',
      'foot.founder': 'Founder of',
      'foot.founder.tail': '— practice management and billing for psychologists',

      /* --- Contact bars / dock --- */
      'bar.email': 'Email',
      'bar.chiama': 'Call',
      'bar.whatsapp': 'WhatsApp',
      'dock.whatsapp': 'Message me on WhatsApp',

      /* --- Article modal --- */
      'art.cta.default': 'Book a first session',
      'art.cta.text.default': 'Did you recognise yourself in these lines? We can start from here.'
    },

    es: {
      /* --- Meta / html lang --- */
      'html.lang': 'es',

      /* --- Navbar --- */
      'nav.chisono': 'Sobre mí',
      'nav.servizi': 'Servicios',
      'nav.test': 'Tests gratuitos',
      'nav.portfolio': 'Portfolio',
      'nav.articoli': 'Artículos',
      'nav.primocolloquio': 'Primera sesión',
      'nav.lang.aria': 'Idioma del sitio',

      'svc.terapia.t': 'Terapia individual y de pareja',
      'svc.terapia.d': 'Enfoque y Análisis de la Demanda',
      'svc.expat.t': 'Italianos en el extranjero',
      'svc.expat.d': 'Terapia online en italiano',
      'svc.superv.t': 'Supervisión clínica',
      'svc.superv.d': 'Para psicólogos, terapeutas y equipos',
      'svc.psicovoice.t': 'PsicoVoice',
      'svc.psicovoice.d': 'La web app para psicólogos',

      'm.group.percorsi': 'Vías de terapia',
      'm.group.colleghi': 'Para colegas',
      'm.group.approfondisci': 'Explora más',
      'm.chisono': 'Sobre mí',
      'm.approccio': 'Enfoque y terapia',
      'm.expat': 'Italianos en el extranjero',
      'm.test': 'Tests gratuitos',
      'm.superv': 'Supervisión clínica',
      'm.psicovoice': 'PsicoVoice',
      'm.percorso': 'Experiencia y CV',
      'm.portfolio': 'Portfolio y casos de estudio',
      'm.articoli': 'Recursos y artículos',
      'm.email': 'Email',
      'm.whatsapp': 'WhatsApp',
      'm.cta': 'Reserva una primera sesión',
      'm.lang.label': 'Idioma',

      /* --- Hero --- */
      'hero.badge': 'Terapia online en toda Italia y para italianos en el extranjero · Consulta en Itri (LT)',
      'hero.title': 'Toda petición de ayuda contiene ya una dirección.<br><span class="text-mirtillo-600">Juntos podemos descifrarla.</span>',
      'hero.p1': 'Soy <strong>Alberto Del Bove</strong>, <strong>psicólogo online</strong> y psicoterapeuta psicoanalítico, especialista en <strong>Análisis de la Demanda</strong>. Acompaño procesos online en toda Italia y desde el extranjero, y presenciales en Itri (LT).',
      'hero.p2': 'Junto a la práctica clínica sumo años de experiencia en salud mental digital como Clinical Team Lead y Clinical Operations Manager, y soy Fundador de <strong>PsicoVoice</strong>. Conozco de cerca el esfuerzo de quien atraviesa momentos difíciles, dentro y fuera del trabajo.',
      'hero.cta1': 'Empieza tu proceso',
      'hero.cta2': 'Terapia de pareja',
      'hero.testlink': '¿No sabes por dónde empezar? Haz un test gratuito de 2 minutos',
      'hero.badge1': 'Colegio de Psicólogos del Lazio n.º 23754',
      'hero.badge2': 'Especialización SPS Roma, 2022',
      'hero.badge3': 'IT · EN · ES',
      'hero.figcaption': 'Una primera sesión de conocimiento: un espacio para entender juntos qué necesitas.',

      /* --- Teaser test --- */
      'teaser.kicker': 'Gratuitos · anónimos · 2-3 minutos · con informe PDF',
      'teaser.title': 'Cuatro tests para empezar a entenderte mejor.',
      'teaser.chip.personalita': 'Personalidad',
      'teaser.chip.carico': 'Carga de trabajo',
      'teaser.chip.adhd': 'Atención e impulsividad',
      'teaser.chip.domanda': 'Tu demanda',
      'teaser.cta': 'Haz un test gratuito',

      /* --- Chi sono --- */
      'chi.kicker': 'Sobre mí',
      'chi.title': 'Una historia en escucha: <br>entre clínica, personas y organizaciones',
      'chi.p1': 'Mi camino nace en la <strong>Universidad Sapienza de Roma</strong>, donde me licencié en Psicología Clínica tras el grado en Ciencias Psicológicas. Desde <strong>2018</strong> soy psicólogo colegiado y enseguida empecé a trabajar en dos frentes: la práctica clínica privada y la coordinación de proyectos en organizaciones sociosanitarias, donde aprendí que el malestar de las personas nunca vive en el vacío, sino dentro de relaciones, contextos y culturas organizativas concretas.',
      'chi.p2': 'En <strong>2022</strong> concluí la escuela de especialización de cuatro años en <strong>Psicoterapia Psicoanalítica en la SPS de Roma</strong>, formándome en el <strong>Análisis de la Demanda</strong>: un enfoque que no se conforma con el síntoma, sino que explora el significado de la petición de ayuda dentro de la historia y los contextos de quien la trae.',
      'chi.p3': 'En esos mismos años mi carrera tomó una dirección que pocos terapeutas recorren: en <strong>Unobravo</strong> fui <strong>Clinical Team Lead, psicoterapeuta y formador ECM</strong>, acompañando al equipo clínico en una fase de crecimiento extraordinario, entre calidad, retención y compromiso de los terapeutas. Después, en <strong>BetterHelp</strong> — la mayor plataforma de terapia online del mundo — trabajé como <strong>Clinical Operations Manager</strong> para los mercados europeos.',
      'chi.p4': 'De esta doble experiencia nació <strong>PsicoVoice</strong>, el software de gestión y facturación para psicólogos que fundé: el punto donde mi alma clínica se encuentra con la digital y directiva.',
      'chi.quote': '¿Por qué te importa todo esto? Porque cuando me hablas de burnout, de un jefe difícil, de un trabajo que te vacía o de una carrera en el extranjero, no tengo que imaginar ese mundo: he trabajado dentro de él, cada día.',
      'chi.link': 'Si te reconoces en estas palabras, hablemos: reserva una primera sesión',
      'chi.stat1': 'años de práctica clínica',
      'chi.stat2': 'idiomas de trabajo',
      'chi.stat3': 'modalidades: online y presencial',

      /* --- Approccio --- */
      'app.kicker': 'Enfoque terapéutico',
      'app.title': 'El Análisis de la Demanda: <br>partir de lo que pides, no solo de lo que sientes',
      'app.intro': 'Cuando alguien pide ayuda, trae mucho más que un síntoma: trae una historia, relaciones, un contexto. El enfoque psicoanalítico basado en el <strong>Análisis de la Demanda</strong> trabaja justo ahí — sobre el significado que la ansiedad, los bloqueos o el cansancio adquieren <em>en tu vida</em>, para transformar el sufrimiento en comprensión y la comprensión en posibilidad de desarrollo.',
      'app.c1.t': 'Escucha de la demanda',
      'app.c1.d': 'El primer trabajo no es dar respuestas, sino entender juntos qué estás pidiendo realmente: a ti mismo, a los demás, a tus contextos de vida. A menudo es aquí donde empieza el cambio.',
      'app.c2.t': 'La persona en sus contextos',
      'app.c2.d': 'Familia, pareja, trabajo: los síntomas hablan el idioma de las relaciones en las que vivimos. Trabajamos sobre la relación entre tú y tus sistemas de pertenencia, no sobre una etiqueta diagnóstica.',
      'app.c3.t': 'De la comprensión al desarrollo',
      'app.c3.d': 'El objetivo no es solo estar mejor, sino adquirir herramientas para leer situaciones, gestionar relaciones y construir procesos de crecimiento que sigan siendo tuyos incluso después de la terapia.',
      'app.online.badge': 'Mi modalidad principal',
      'app.online.t': 'Terapia online',
      'app.online.d': 'Trabajo online desde hace años, con cientos de procesos acompañados a través de las principales plataformas de terapia digital. La modalidad online, si se conduce con método, tiene la misma profundidad que la sala de análisis — con algunas ventajas más:',
      'app.online.li1': 'Continuidad: la terapia te sigue aunque te mudes, viajes o vivas en el extranjero',
      'app.online.li2': 'Flexibilidad horaria, pensada también para quien tiene ritmos de trabajo intensos',
      'app.online.li3': 'La comodidad de un espacio propio, que a menudo facilita abrirse',
      'app.online.li4': 'Sin tiempo perdido en desplazamientos: más energía para el trabajo terapéutico',
      'app.online.cta': 'Reserva una sesión online',
      'app.studio.badge': 'Presencial',
      'app.studio.t': 'La consulta de Itri (LT)',
      'app.studio.d': 'Para quien prefiere el encuentro presencial, atiendo en mi consulta en <strong>Via Luigi Pirandello 8, Itri</strong>, punto de referencia también para Formia, Gaeta, Fondi y el sur pontino.',
      'app.studio.li1': 'Procesos individuales para adultos y jóvenes adultos',
      'app.studio.li2': 'Asesoramiento y apoyo para parejas y familias',
      'app.studio.li3': 'Posibilidad de fórmulas mixtas: consulta + online',
      'app.studio.cta': 'Reserva una sesión presencial',

      /* --- Primo colloquio --- */
      'pc.kicker': 'Ningún salto al vacío',
      'pc.title': 'Cómo funciona la primera sesión',
      'pc.intro': 'Cuatro pasos, sin compromiso: saber qué esperar ya es parte de cuidarse.',
      'pc.tab0': 'Me escribes',
      'pc.tab1': 'Te respondo',
      'pc.tab2': 'Nos conocemos',
      'pc.tab3': 'Decidimos juntos',
      'pc.cta': 'Da el primer paso',
      'pc.note': 'La primera sesión es de conocimiento y no te compromete a continuar.',

      /* --- Expat --- */
      'expat.kicker': 'Italianos en el extranjero',
      'expat.title': 'Psicoterapia online para italianos que viven en el extranjero',
      'expat.p1': 'Vivir en otro país es una experiencia que transforma — y que a veces pone a prueba más de lo que se imagina: nostalgia, sensación de desarraigo, relaciones por reconstruir, una identidad profesional por redefinir. Y cuando llega el momento de pedir ayuda, hacerlo <strong>en un idioma que no es el tuyo</strong> puede volverlo todo más difícil.',
      'expat.p2': 'La psicoterapia trabaja con los matices: con las palabras exactas de tu historia, con los dichos de casa, con lo que queda implícito. Por eso, para muchos italianos en el extranjero, poder hacer terapia <strong>en la lengua materna</strong> no es un detalle: es la condición para que el trabajo terapéutico llegue a lo profundo.',
      'expat.p3': 'He vivido y trabajado entre <strong>Italia y España</strong> y durante años operé en organizaciones internacionales y remote-first: conozco en primera persona las dificultades y los recursos de la vida expat. Las sesiones online se adaptan a tu franja horaria y te acompañan allá donde te lleve tu proceso.',
      'expat.tag1': 'Sesiones en italiano, estés donde estés',
      'expat.tag2': 'Horarios flexibles según tu huso horario',
      'expat.tag3': 'Experiencia directa de vida expat',
      'expat.cta': 'Escríbeme desde donde estés',

      /* --- Test section --- */
      'test.kicker': 'Herramientas interactivas gratuitas',
      'test.title': 'Cuatro tests para empezar a entenderte mejor',
      'test.intro': 'Cuatro breves herramientas de autoobservación, construidas con criterios clínicos: personalidad, el peso real del trabajo, atención e impulsividad, y lo que estás buscando de verdad. <strong>Gratuitos, anónimos, sin registro</strong> — tus respuestas nunca salen de tu dispositivo.',
      'test.card1.badge': 'El más querido',
      'test.card1.t': '¿Qué tipo psicológico eres?',
      'test.card1.d': '9 preguntas inspiradas en C.G. Jung para descubrir dónde encuentras energía, cómo lees el mundo y cómo decides. 8 perfiles, con puntos fuertes y márgenes de crecimiento — sin etiquetas.',
      'test.card1.time': '3 minutos',
      'test.card1.q': '9 preguntas',
      'test.card2.badge': 'Para quien trabaja demasiado',
      'test.card2.t': '¿Cuánto te está costando el trabajo?',
      'test.card2.d': '8 situaciones concretas para medir tu nivel de desgaste: energías, distancia, recuperación. Una puntuación clara sobre 24, cuatro franjas de lectura y las señales que no hay que ignorar.',
      'test.card2.time': '2 minutos',
      'test.card2.q': '8 preguntas',
      'test.card3.badge': 'El más profundo',
      'test.card3.t': '¿Qué estás pidiendo, de verdad?',
      'test.card3.d': '5 preguntas inspiradas en el Análisis de la Demanda para enfocar el área de tu vida que pide atención: relaciones, trabajo, identidad o dirección.',
      'test.card3.time': '2 minutos',
      'test.card3.q': '5 preguntas',
      'test.card4.badge': 'Novedad',
      'test.card4.t': 'Atención e impulsividad: ¿cuánto pesan?',
      'test.card4.d': '10 situaciones cotidianas inspiradas en los cuestionarios de cribado del TDAH adulto. No es un diagnóstico: es una pista para entender si vale la pena profundizar con un profesional.',
      'test.card4.time': '3 minutos',
      'test.card4.q': '10 preguntas',
      'test.start': 'Empezar el test',
      'test.alltests': 'Todos los tests',
      'test.back': 'Pregunta anterior',
      'test.result.disclaimer': 'Esta herramienta ofrece elementos de autoobservación: no es un test diagnóstico y no sustituye una valoración profesional.',
      'test.download': 'Descargar el informe en PDF',
      'test.result.share.q': '¿Quieres dar palabras a este resultado? Reserva una sesión y compártelo conmigo: será un buen punto de partida.',
      'test.result.share.cta': 'Reserva y comparte el resultado',
      'test.restart': 'Repetir este test',
      'test.other': 'Prueba otro test',
      'test.faq.title': 'Preguntas frecuentes sobre los tests',
      'test.faq1.q': '¿Estos tests son un diagnóstico psicológico?',
      'test.faq1.a': 'No. Son herramientas de autoobservación construidas con criterios clínicos, pensadas para encender una reflexión — no para clasificarte. Una valoración real solo nace del encuentro con un profesional: si un resultado te impacta, la primera sesión es el lugar adecuado para profundizarlo.',
      'test.faq2.q': '¿Dónde acaban mis respuestas?',
      'test.faq2.a': 'En ninguna parte: los tests funcionan enteramente en tu navegador. Las respuestas no se guardan, ni se rastrean ni se envían — el resultado lo ves solo tú, y tú decides si compartirlo conmigo en el formulario de contacto.',
      'test.faq3.q': '¿Cuánto duran y cuánto cuestan?',
      'test.faq3.a': 'De 2 a 3 minutos cada uno, y son completamente gratuitos. Puedes repetirlos cuantas veces quieras: incluso observar cómo cambian tus respuestas con el tiempo es una información interesante.',
      'test.faq4.q': '¿Qué hago con el resultado?',
      'test.faq4.a': 'Puedes guardarlo para ti como reflexión, o compartirlo conmigo con un clic: el botón bajo cada resultado rellena el formulario de contacto. En la primera sesión partiremos de ahí — de lo que el test movió, más que de la puntuación en sí.',

      /* --- Percorso / CV --- */
      'perc.kicker': 'Experiencia y CV',
      'perc.title': 'Las etapas de un camino doble',
      'perc.intro': 'Del presente a las raíces: por un lado el trabajo clínico y organizativo, por otro una formación que nunca se ha detenido.',
      'perc.lavoro.h': 'Experiencia profesional',
      'perc.form.h': 'Formación',
      'perc.today': 'Hoy',
      'perc.inprogress': 'En curso',
      'perc.l1.h': 'Fundador',
      'perc.l1.d': 'PsicoVoice es el software de gestión y facturación para psicólogos que fundé: el punto de encuentro entre mi alma clínica y la digital y directiva.',
      'perc.l2.h': 'Clinical Operations Manager (EU)',
      'perc.l2.d': 'En la mayor plataforma de terapia online del mundo contribuí a la calidad clínica y a las operaciones en los mercados europeos: selección de profesionales, estándares de servicio y cumplimiento normativo.',
      'perc.l3.h': 'Clinical Team Lead, psicoterapeuta y formador ECM',
      'perc.l3.d': 'En la principal plataforma italiana de psicología online contribuí a la calidad clínica, la retención y el compromiso del equipo de terapeutas, cuidando su selección, desarrollo y formación acreditada ECM.',
      'perc.l4.date': 'Desde 2018 · Práctica privada',
      'perc.l4.h': 'Psicólogo y Psicoterapeuta',
      'perc.l4.d': 'Procesos de psicoterapia online y presenciales, entre Italia y España, con adultos, parejas y familias.',
      'perc.l5.date': '2018 – 2021 · Organizaciones sociosanitarias',
      'perc.l5.h': 'Psicólogo y Project Manager',
      'perc.l5.d': 'Coordinación de programas de inclusión y empleabilidad, evaluación de competencias y gestión de equipos multidisciplinares en contextos residenciales y territoriales.',
      'perc.f1.date': 'Desde enero de 2026 · Arden University (UK)',
      'perc.f1.h': 'MSc en Strategic Human Resource Management (CIPD Level 7)',
      'perc.f1.d': 'Máster acreditado por CIPD, CMI, SHRM y HRCI: talento y compensación, people analytics, relaciones laborales y derecho del trabajo, bienestar y desempeño, desarrollo organizativo y cambio. Affiliate Member del Chartered Management Institute (CMI).',
      'perc.f1.link': 'Mira tres casos de estudio del Máster',
      'perc.f2.h': 'Especialización en Psicoterapia Psicoanalítica',
      'perc.f2.d': 'Escuela de cuatro años orientada al Análisis de la Demanda: el enfoque que guía todo mi trabajo clínico.',
      'perc.f3.h': 'Habilitación y colegiación (n.º 23754)',
      'perc.f3.d': 'Psicólogo habilitado para el ejercicio de la profesión desde el 26 de marzo de 2018.',
      'perc.f4.h': 'Máster en Psicología Clínica',
      'perc.f5.h': 'Grado en Ciencias Psicológicas',
      'perc.skills.clin': 'Competencias clínicas',
      'perc.skills.mgr': 'Competencias directivas',
      'perc.story': 'Esta es mi historia. <span class="text-mirtillo-700">La primera sesión sirve para que me cuentes la tuya.</span>',
      'perc.story.cta': 'Reserva una primera sesión',

      /* --- Supervisione --- */
      'sup.kicker': 'Para psicólogos, terapeutas y equipos',
      'sup.title': 'Supervisión clínica: un tercer espacio para pensar tu trabajo',
      'sup.p1': 'La supervisión no es un control sobre tu labor, ni un lugar donde recibir la "respuesta correcta". Es un <strong>tercer espacio</strong> en el que detenerse a pensar juntos un caso, una relación terapéutica, un impasse — y recuperar la libertad de moverse cuando el trabajo clínico se vuelve denso, confuso o demasiado cargado.',
      'sup.p2': 'A menudo lo que llamamos "dificultad con un paciente" es en realidad una <strong>pregunta que el caso nos dirige</strong>: a nuestra forma de escuchar, a nuestros puntos ciegos, a los contextos en que trabajamos. La supervisión sirve precisamente para dar palabras a esa pregunta.',
      'sup.model.label': 'Cómo las conduzco: el Análisis de la Demanda aplicado a la supervisión',
      'sup.c1.t': 'El caso y su demanda',
      'sup.c1.d': 'Partimos del material clínico que traes — sesiones, sueños, momentos de bloqueo — para enfocar qué está pidiendo realmente el paciente, a sí mismo y a ti, más allá del síntoma declarado.',
      'sup.c2.t': 'La relación y la contratransferencia',
      'sup.c2.d': 'Lo que sientes en sesión — aburrimiento, fastidio, protección, urgencia — no es un trastorno que corregir sino una herramienta de conocimiento. Aprendemos a leerlo como información sobre el caso.',
      'sup.c3.t': 'El contexto y la institución',
      'sup.c3.d': 'Ningún caso vive en el vacío: servicio, plataforma, presupuesto, mandato. Habiendo dirigido equipos clínicos en empresas de salud mental digital, aporto también una mirada sobre las dinámicas organizativas en las que trabajas.',
      'sup.online.t': 'Online',
      'sup.online.d': 'Por videollamada, dondequiera que ejerzas. He supervisado y formado a terapeutas en remoto durante años: la modalidad online, sostenida con método, tiene la misma densidad que la presencial.',
      'sup.studio.t': 'Presencial',
      'sup.studio.d': 'En la consulta de Itri (LT), para quien prefiere el encuentro en persona o para ciclos de supervisión periódicos, también en fórmula mixta con las sesiones online.',
      'sup.formats.t': 'Formatos disponibles',
      'sup.formats.li1.b': 'Individual',
      'sup.formats.li1.d': '— un proceso sobre tus casos y tu estilo clínico, para recién colegiados o colegas con experiencia.',
      'sup.formats.li2.b': 'De grupo',
      'sup.formats.li2.d': '— pequeños grupos de intervisión entre pares, donde el caso de uno se vuelve pensamiento de todos.',
      'sup.formats.li3.b': 'Para equipos y servicios',
      'sup.formats.li3.d': '— supervisión de institución para equipos clínicos, cooperativas y plataformas.',
      'sup.cta': 'Solicita una supervisión',

      /* --- Risorse / Articoli --- */
      'ris.kicker': 'Recursos y Artículos',
      'ris.title': 'Puntos de partida para reflexionar',
      'ris.intro': 'Lecturas breves sobre temas que encuentro cada día, en terapia y en las organizaciones.',
      'ris.readmore': 'Leer el artículo',
      'ris.a1.cat': 'Trabajo y bienestar',
      'ris.a1.t': 'Burnout: cuando es el contexto el que te pide demasiado',
      'ris.a1.d': 'El burnout no es una debilidad personal: es una relación enferma entre persona y organización. Reconocer las señales tempranas — cinismo, agotamiento, distancia — es el primer paso para no normalizarlas.',
      'ris.a2.cat': 'Ansiedad',
      'ris.a2.t': 'La ansiedad no es un enemigo: es un mensaje por traducir',
      'ris.a2.d': 'Los ataques de pánico y la ansiedad generalizada asustan, pero rara vez llegan "de la nada". A menudo señalan un conflicto entre lo que vivimos y lo que deseamos: escucharlos es más útil que combatirlos.',
      'ris.a3.cat': 'Análisis de la Demanda',
      'ris.a3.t': '"¿Qué estoy pidiendo de verdad?" El poder de entender la propia demanda',
      'ris.a3.d': 'Detrás de "quiero dejar de estar mal" hay siempre una petición más precisa: ser visto, cambiar una relación, reencontrar una dirección. La terapia empieza cuando esa demanda encuentra sus palabras.',
      'ris.a4.cat': 'Atención y trauma',
      'ris.a4.t': 'TDAH adulto: ¿y si la distracción fuera también una protección?',
      'ris.a4.d': 'No toda la desatención tiene la misma historia. En clave psicoanalítica, distraerse y no parar nunca pueden ser también una forma de no sentir: entender de qué uno se distrae cambia el proceso de cuidado.',
      'ris.a5.cat': 'Vivir en el extranjero',
      'ris.a5.t': 'Hacer terapia en la lengua materna: por qué las palabras de casa llegan más hondo',
      'ris.a5.d': 'Se puede vivir perfectamente en una segunda lengua — y darse cuenta de que, cuando se trata de decir el dolor, las palabras extranjeras no pesan. El inconsciente tiene un acento: en terapia marca la diferencia.',
      'ris.a6.cat': 'Vivir en el extranjero',
      'ris.a6.t': 'Vivir en otra parte: la fatiga invisible de quien se va',
      'ris.a6.d': 'La emigración se cuenta como una aventura, pero es también un duelo silencioso: idioma, ritos, pertenencias. Dar nombre a esta fatiga es el primer paso para habitar de verdad el lugar que se eligió para vivir.',
      'ris.a7.cat': 'Sobre mí',
      'ris.a7.t': 'Por qué hago este oficio (y por qué en dos mundos)',
      'ris.a7.d': 'Psicoterapeuta y People Manager: dos palabras que parecen lejanas y que, en mi historia, siempre se han hablado. Un relato personal de cómo llegué hasta aquí.',

      /* --- Portfolio --- */
      'pf.kicker': 'Portfolio · MSc Strategic HRM',
      'pf.title': 'Tres casos de estudio entre personas, organizaciones y datos',
      'pf.intro': 'Desde enero de 2026 estudio <strong>Strategic Human Resource Management</strong> (MSc, CIPD Level 7) en Arden University. Estos tres trabajos académicos muestran la otra mitad de mi mirada: leo las organizaciones — plataformas, equipos, datos — con la misma atención crítica con la que en terapia escucho a las personas.',
      'pf.c1.kicker': 'Strategic Planning & Ethics',
      'pf.c1.t': 'Una sola misión, dos plantillas',
      'pf.c1.d': 'Una plataforma italiana de salud mental digital: 300 empleados y 7.000 profesionales autónomos. El modelo se sostiene sobre el papel — pero una reestructuración gestionada a dos velocidades y una decisión nunca motivada muestran dónde estrategia y ética se separan.',
      'pf.c1.chip3': 'RSC de Carroll',
      'pf.c1.chip4': 'Lentes éticas',
      'pf.c1.meta1': 'Informe académico',
      'pf.c1.meta2': '6 min de lectura',
      'pf.c2.kicker': 'People Analytics',
      'pf.c2.t': 'Los datos que una empresa mira — y los que no recoge',
      'pf.c2.d': 'Una empresa SaaS global, 370 personas en doce países: el desempeño se mide cada mes, pero nadie recoge compromiso, motivos de salida, retorno de la formación. Un análisis de cómo los datos de personas se vuelven valor — o quedan como mero control.',
      'pf.c2.chip2': 'Modelo de Ulrich',
      'pf.c2.chip4': 'Teoría de stakeholders',
      'pf.c2.meta1': 'Presentación + pódcast',
      'pf.c2.meta2': '5 min de lectura',
      'pf.c3.kicker': 'Employment Relations & Law',
      'pf.c3.t': 'El terapeuta y el algoritmo',
      'pf.c3.d': 'Una plataforma global de terapia online, 30.000 terapeutas autónomos: nadie negocia las reglas del trabajo, porque están escritas en el software. Relaciones laborales, voz y contrato psicológico donde la dirección es un algoritmo — y qué dice el derecho italiano y europeo.',
      'pf.c3.chip1': 'Sistema de Dunlop',
      'pf.c3.chip3': 'Contrato psicológico',
      'pf.c3.meta1': 'Informe académico',
      'pf.c3.meta2': '6 min de lectura',
      'pf.readcs': 'Leer el caso de estudio',
      'pf.disclaimer': 'Los tres trabajos nacen como evaluaciones del Máster y aquí se resumen en forma divulgativa. Las organizaciones analizadas están anonimizadas, como en los originales; los datos y episodios citados provienen de los propios trabajos y de fuentes públicas.',

      /* --- Compendios y Guías (publicaciones de pago) --- */
      'nav.compendi': 'Compendios',
      'm.compendi': 'Compendios y Guías',
      'comp.kicker': 'Compendios y Guías',
      'comp.title': 'Textos clínicos en profundidad, para leer por completo',
      'comp.intro': 'Cada semana publico nuevos compendios y guías: textos largos y cuidados, para quien quiere ir a fondo. Aquí encuentras un extracto gratuito de cada uno; el texto completo está disponible en Gumroad.',
      'comp.c1.badge': 'Para terapeutas',
      'comp.c1.t': 'TDAH adulto: una mirada psicodinámica',
      'comp.c1.d': 'Un compendio para psicoterapeutas de orientación psicodinámica que atienden a pacientes adultos con TDAH, sin reducir a la persona a su funcionamiento ejecutivo.',
      'comp.c2.badge': 'Para quien convive con el TDAH',
      'comp.c2.t': 'TDAH en la adultez: una guía para entenderte',
      'comp.c2.d': 'Una guía para adultos con TDAH (o que sospechan tenerlo): palabras claras para entenderte, historias en las que reconocerte, estrategias de tu lado.',
      'comp.c3.badge': 'Para clínicos',
      'comp.c3.t': 'TDAH adulto: un compendio psicodinámico',
      'comp.c3.d': 'La edición inglesa del compendio para clínicos: la misma mirada psicodinámica sobre el TDAH adulto, pensada para colegas que trabajan en inglés.',
      'comp.readexcerpt': 'Leer el extracto',
      'comp.buy': 'Comprar en Gumroad',
      'comp.note': 'Los extractos publicados aquí son una pequeña vista previa: el texto íntegro, con todos los capítulos, está reservado a quien compra la publicación en Gumroad.',

      /* --- PsicoVoice --- */
      'pv.kicker': 'Un proyecto que fundé · para colegas psicólogos',
      'pv.title': 'La web app que simplifica facturas y gestión de pacientes',
      'pv.p': 'Creé <strong class="text-white">PsicoVoice</strong> para liberar a psicólogos y psicoterapeutas de la burocracia: facturación, exigibilidad, gestión de pacientes y citas en una única herramienta, pensada por quien conoce el oficio desde dentro.',
      'pv.cta': 'Descubre PsicoVoice · www.psicovoice.it',
      'pv.li1': 'Facturación y exigibilidad sin quebraderos de cabeza',
      'pv.li2': 'Fichas y expedientes de pacientes ordenados',
      'pv.li3': 'Citas y recordatorios de un vistazo',
      'pv.li4': 'Pensada a medida para la profesión psicológica',

      /* --- Contatti --- */
      'con.kicker': 'Contacto y Sede',
      'con.title': 'El primer paso es una pregunta',
      'con.intro': 'Esto no es un cuestionario diagnóstico: es el primer espacio en el que tu demanda es escuchada. Cuéntame lo que quieras, como te salga. <strong>Te contacto en 24–48 horas</strong> para concertar una primera sesión de conocimiento, online o presencial.',
      'con.f.nome': 'Nombre y apellidos',
      'con.f.nome.ph': 'Tu nombre',
      'con.f.email': 'Email',
      'con.f.email.ph': 'nombre@ejemplo.com',
      'con.f.tel': 'Teléfono',
      'con.f.tel.opt': '(opcional)',
      'con.f.setting': 'Preferencia de modalidad',
      'con.f.setting.online': 'Online',
      'con.f.setting.studio': 'Presencial en Itri (LT)',
      'con.f.setting.nonso': 'Aún no lo sé',
      'con.f.temi.legend': '¿De qué te gustaría hablar?',
      'con.f.temi.help': 'Selecciona uno o más temas, solo si quieres: me ayuda a acogerte mejor, no es obligatorio.',
      'con.f.tema.ansia': 'Ansiedad / Ataques de pánico',
      'con.f.tema.burnout': 'Estrés laboral / Burnout',
      'con.f.tema.rel': 'Dificultades relacionales',
      'con.f.tema.crescita': 'Crecimiento personal',
      'con.f.tema.orient': 'Orientación profesional',
      'con.f.tema.estero': 'Vivo en el extranjero',
      'con.f.tema.coppia': 'Terapia de pareja',
      'con.f.tema.superv': 'Supervisión clínica (para colegas)',
      'con.f.temi.feedback': 'Gracias: partiremos de aquí.',
      'con.f.msg': 'Tu mensaje',
      'con.f.msg.ph': 'Escríbeme con libertad: qué te trae aquí, desde cuándo, qué te gustaría cambiar…',
      'con.f.send.email': 'Enviar por Email',
      'con.f.send.wa': 'Escríbeme por WhatsApp',
      'con.f.copy': 'O copia el mensaje',
      'con.f.copy.and': 'y envíalo como prefieras',
      'con.f.privacy': 'Tus datos se usan exclusivamente para contactarte y se tratan con confidencialidad, respetando el secreto profesional y el RGPD.',
      'con.info.t': 'Contactos directos',
      'con.info.email': 'Email',
      'con.info.tel': 'Teléfono / WhatsApp',
      'con.info.studio': 'Consulta',
      'con.map.note': 'La consulta está en Itri, en la provincia de Latina, fácilmente accesible desde Formia, Gaeta, Fondi, Sperlonga y todo el sur pontino.',
      'con.online.t': 'Modalidad online',
      'con.online.d': 'Las sesiones online se realizan por videollamada en plataformas seguras, con la misma confidencialidad que la consulta. Disponibilidad en franjas horarias amplias, también para quien vive en otro huso horario.',
      'con.faq.title': 'Preguntas frecuentes sobre el proceso',
      'con.faq1.q': '¿Cuánto cuesta una sesión?',
      'con.faq1.a': 'El coste se define con claridad en el primer contacto, antes de empezar: sin sorpresas. La primera sesión de conocimiento sirve también para esto — entender juntos qué necesitas y acordar costes y frecuencia de forma transparente.',
      'con.faq2.q': '¿Cuánto dura una sesión y con qué frecuencia nos vemos?',
      'con.faq2.a': 'Una sesión dura normalmente unos 50 minutos. La frecuencia — habitualmente semanal — no es una regla impuesta: la definimos juntos según lo que traes y la fase del proceso.',
      'con.faq3.q': '¿Cómo funciona, en la práctica, una sesión online?',
      'con.faq3.a': 'Nos conectamos por videollamada en una plataforma segura, a la hora acordada. Solo necesitas una conexión estable y un espacio reservado para hablar con libertad. La confidencialidad es la misma que en la consulta, garantizada por el secreto profesional.',
      'con.faq4.q': '¿Qué diferencia hay entre psicólogo y psicoterapeuta?',
      'con.faq4.a': 'El psicólogo está licenciado en psicología y habilitado por el Colegio; el psicoterapeuta tiene además una especialización de cuatro años que lo habilita a tratar con psicoterapia. Soy psicólogo desde 2018 y psicoterapeuta psicoanalítico, especializado en la SPS de Roma en 2022.',
      'con.faq5.q': '¿Lo que digo queda entre nosotros?',
      'con.faq5.a': 'Sí. Todo lo que emerge en sesión está protegido por el secreto profesional, al que estoy obligado por ley y deontología. También tus datos de contacto se tratan conforme al RGPD, solo para contactarte.',
      'con.faq6.q': '¿Las sesiones son deducibles?',
      'con.faq6.a': 'Sí: las sesiones de psicoterapia son prestaciones sanitarias y la factura es deducible como gasto sanitario en la declaración de la renta, según las normas vigentes. Recibirás factura por cada sesión.',

      /* --- Footer --- */
      'foot.role': 'Psicólogo Psicoterapeuta · Especialista en Análisis de la Demanda',
      'foot.board': 'Colegiado en el Colegio de Psicólogos del Lazio n.º 23754 (desde 2018)',
      'foot.nav.chisono': 'Sobre mí',
      'foot.nav.approccio': 'Enfoque',
      'foot.nav.expat': 'Italianos en el extranjero',
      'foot.nav.portfolio': 'Portfolio',
      'foot.nav.psicovoice': 'PsicoVoice',
      'foot.nav.contatti': 'Contacto',
      'foot.rights': 'Todos los derechos reservados',
      'foot.founder': 'Fundador de',
      'foot.founder.tail': '— gestión y facturación para psicólogos',

      /* --- Contact bars / dock --- */
      'bar.email': 'Email',
      'bar.chiama': 'Llamar',
      'bar.whatsapp': 'WhatsApp',
      'dock.whatsapp': 'Escríbeme por WhatsApp',

      /* --- Article modal --- */
      'art.cta.default': 'Reserva una primera sesión',
      'art.cta.text.default': '¿Te has reconocido en estas líneas? Podemos partir de aquí.'
    }
  };

  /* ----------------------------------------------------------
     MOTORE
     ---------------------------------------------------------- */
  var STORAGE_KEY = 'siteLang';
  var state = { lang: 'it' };

  function translateNode(el, lang) {
    var key = el.getAttribute('data-i18n');
    if (key == null) { return; }
    if (el.__i18nSrc === undefined) { el.__i18nSrc = el.innerHTML; }
    var dict = DICT[lang];
    el.innerHTML = (dict && dict[key] != null) ? dict[key] : el.__i18nSrc;
  }

  function translateAttr(el, attr, dataKey, lang) {
    var key = el.getAttribute(dataKey);
    if (key == null) { return; }
    var store = '__i18nAttr_' + attr;
    if (el[store] === undefined) { el[store] = el.getAttribute(attr) || ''; }
    var dict = DICT[lang];
    el.setAttribute(attr, (dict && dict[key] != null) ? dict[key] : el[store]);
  }

  function apply(lang) {
    if (LANGS.indexOf(lang) === -1) { lang = 'it'; }
    state.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) { translateNode(el, lang); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { translateAttr(el, 'placeholder', 'data-i18n-ph', lang); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { translateAttr(el, 'aria-label', 'data-i18n-aria', lang); });

    // <html lang="…"> per accessibilità e SEO on-page
    document.documentElement.setAttribute('lang', lang);

    // Stato visivo dei bottoni lingua
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}

    // Ridisegna le icone (gli innerHTML sostituiti non contengono icone,
    // ma alcune label sì): sicuro chiamarlo comunque.
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    // Notifica i contenuti dinamici (stepper, articoli, test)
    if (typeof state.onChange === 'function') { state.onChange(lang); }
  }

  function init() {
    var saved = 'it';
    try { saved = localStorage.getItem(STORAGE_KEY) || 'it'; } catch (e) {}
    // Bottoni lingua (desktop + mobile)
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-lang')); });
    });
    apply(saved);
  }

  // API pubblica per i contenuti dinamici
  window.SiteI18N = {
    get lang() { return state.lang; },
    apply: apply,
    onChange: function (fn) { state.onChange = fn; },
    t: function (key) {
      var dict = DICT[state.lang];
      return (dict && dict[key] != null) ? dict[key] : null;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
