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
      /* Niente più ombra grigia sotto ogni scheda: le superfici si
         separano con un filo, l'ombra vera resta solo ai pannelli che
         galleggiano (menu, finestre, avvisi). */
      boxShadow: {
        sm: '0 0 0 1px rgb(27 42 58 / 0.07)',
        DEFAULT: '0 0 0 1px rgb(27 42 58 / 0.08)',
        md: '0 0 0 1px rgb(27 42 58 / 0.10)',
        lg: '0 0 0 1px rgb(27 42 58 / 0.10)',
        xl: '0 18px 40px -18px rgb(18 28 39 / 0.35), 0 0 0 1px rgb(27 42 58 / 0.08)',
        '2xl': '0 24px 56px -20px rgb(18 28 39 / 0.40)'
      }
    }
  }
}
