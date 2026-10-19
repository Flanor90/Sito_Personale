/* Config Tailwind del sito.
   Il CSS viene compilato staticamente in assets/tailwind.css:
     npm run build:css
   Da rilanciare ogni volta che si aggiungono classi nuove in index.html
   o nei file JS di assets/ (le classi generate via JS vengono lette da lì). */
module.exports = {
  // build-pagine.js va incluso: l'impalcatura delle pagine dedicate (e le
  // classi che ci stanno dentro, come il distanziamento sotto l'intestazione
  // fissa) vive lì, non nei file di contenuto. Dimenticarlo produce pagine
  // che sembrano giuste nel codice e sbagliate a schermo.
  content: ['./index.html', './pagine/*.html', './assets/*.js', './build-pagine.js'],
  theme: {
    extend: {
      /* Ridisegno di ottobre 2026 — vedi BRANDBOOK.md §7–9.
         I nomi dei token restano quelli storici (crema, tortora…) perché
         sono usati in centinaia di classi; cambiano i valori. Crema non è
         più un crema caldo: è il bianco calce dei muri del sud pontino,
         appena freddo. Lume è nuovo: l'unico accento caldo, solo per
         dettagli decorativi, mai per testo su fondo chiaro. */
      colors: {
        notte:    { DEFAULT: '#1B2A3A', light: '#24374C', deep: '#121C27' },
        mirtillo: { 50: '#EEF0F6', 100: '#E1E3F0', 200: '#C7C9E4', 300: '#A9ACD4', DEFAULT: '#7C81B3', 500: '#6C71A6', 600: '#5C6197', 700: '#4C507F' },
        crema:    { DEFAULT: '#F4F5F2', dark: '#E9EBE6' },
        tortora:  { DEFAULT: '#DDDFDA', dark: '#C4C7C1' },
        lume:     { DEFAULT: '#E9B872', soft: '#F3D9AE' },
        inchiostro: '#22262D'
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif']
      },
      /* Raggi più asciutti: prima ogni scheda aveva lo stesso angolo
         morbido da 16–24px, e tutto sembrava lo stesso componente. */
      borderRadius: {
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem'
      },
      /* Profondità: ombre a più strati, tinte di notte e non grigie, come
         la luce vera che cade su carta spessa. Ogni livello ha un filo di
         contorno e una penombra lunga: le superfici sembrano posate, non
         ritagliate. sm = appoggiato, md/lg = sollevato, xl/2xl = sospeso
         (menu, finestre, ritratto). */
      boxShadow: {
        sm: '0 0 0 1px rgb(27 42 58 / 0.06), 0 1px 2px rgb(18 28 39 / 0.05), 0 6px 14px -8px rgb(18 28 39 / 0.12)',
        DEFAULT: '0 0 0 1px rgb(27 42 58 / 0.06), 0 2px 4px rgb(18 28 39 / 0.05), 0 10px 22px -12px rgb(18 28 39 / 0.16)',
        md: '0 0 0 1px rgb(27 42 58 / 0.06), 0 2px 4px rgb(18 28 39 / 0.05), 0 14px 28px -14px rgb(18 28 39 / 0.22)',
        lg: '0 0 0 1px rgb(27 42 58 / 0.06), 0 4px 8px rgb(18 28 39 / 0.05), 0 22px 44px -18px rgb(18 28 39 / 0.28)',
        xl: '0 0 0 1px rgb(27 42 58 / 0.06), 0 6px 12px rgb(18 28 39 / 0.06), 0 32px 64px -24px rgb(18 28 39 / 0.38)',
        '2xl': '0 0 0 1px rgb(27 42 58 / 0.08), 0 10px 20px rgb(18 28 39 / 0.08), 0 48px 96px -32px rgb(18 28 39 / 0.50)'
      }
    }
  }
}
