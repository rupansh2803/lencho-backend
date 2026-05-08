/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#FFD700',
        'gold-dark': '#FFC700',
        purple: '#9945FF'
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Jost', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}