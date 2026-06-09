/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand:      '#5B4FF5',
        brand2:     '#7C6FF7',
        'brand-light': '#EDE9FF',
        bot:        '#8B5CF6',
        'bot-bg':   '#f3f0ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
