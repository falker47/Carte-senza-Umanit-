export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'cah-black': '#231f20',
        'cah-white': '#ffffff',
        'cah-gray': '#f5f5f5',
        'cah-accent': '#ff5252',
      },
      fontFamily: {
        'cah': ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'cah': '0 4px 6px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}