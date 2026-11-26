/** @type {import('tailwindcss').Config} */

// Alle kleuren lopen via CSS-variabelen (zie style.css) zodat licht/donker met één klasse op <html> wisselt.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`
const scale = (prefix, steps) => Object.fromEntries(steps.map((s) => [s, v(`${prefix}-${s}`)]))

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
const accent = { ...scale('accent', STEPS), DEFAULT: v('accent-700') }

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Montserrat Variable"', 'Montserrat', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        // Alleen voor titels: reisnamen, paginakoppen, de landingspagina.
        display: ['"Fraunces Variable"', 'Fraunces', 'ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      colors: {
        // Stijlrichting A "Nordic Minimal"
        ground: v('ground'),
        surface: v('surface'),
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        ink: v('ink'),
        body: v('body'),
        muted: v('muted'),
        gray: scale('gray', STEPS),
        accent,
        primary: accent, // alias voor oudere klassen
        rating: { DEFAULT: '#D97706', text: v('rating-text') },
        transit: v('transit'),
      },
      boxShadow: {
        // Alleen voor zwevende lagen (dropdowns, modals, toasts); kaarten gebruiken een hairline.
        pop: '0 16px 40px -16px rgb(var(--c-shadow) / 0.28), 0 2px 6px -2px rgb(var(--c-shadow) / 0.08)',
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
}
