/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1B4F72',
        secondary: '#2E86C1',
        success: '#148F77',
        warning: '#D35400',
        danger: '#C0392B',
        info: '#6C3483',
        bg: '#F4F6F7',
        text: '#1C2833',
        subtext: '#566573',
        border: '#D5D8DC',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
