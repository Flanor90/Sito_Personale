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
      colors: {
        notte:    { DEFAULT: '#1B2A3A', light: '#24374C', deep: '#141F2C' },
        mirtillo: { 50: '#F0F1F8', 100: '#E2E4F1', 200: '#C7C9E4', 300: '#A9ACD4', DEFAULT: '#7C81B3', 500: '#6C71A6', 600: '#60659B', 700: '#4C507F' },
        crema:    { DEFAULT: '#F7F5F1', dark: '#EFECE5' },
        tortora:  { DEFAULT: '#E4DFD8', dark: '#CFC8BD' },
        inchiostro: '#2B2B2B'
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  }
}
