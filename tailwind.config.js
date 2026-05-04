export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdfa', // teal-50  — subtle tinted backgrounds
          100: '#ccfbf1', // teal-100
          500: '#14b8a6', // teal-500 — dots / small marks
          600: '#0d9488', // teal-600 — links, focus borders (accessible contrast on white)
          700: '#0f766e', // teal-700 — hover state
        },
      },
    },
  },
  plugins: [],
}
