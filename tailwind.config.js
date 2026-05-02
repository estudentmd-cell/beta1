/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      { DEFAULT: '#FAF8F5', 2: '#F0EDE6', 3: '#E8E4DB' },
        card:    '#FFFFFF',
        tx:      { 1: '#2C2520', 2: '#5C544B', 3: '#8A8078', 4: '#857D74' },
        ac:      { DEFAULT: '#3D6B5E', 2: '#4D8B74', light: '#E8F2ED' },
        cyan:    { DEFAULT: '#2BB5B2', light: '#E5F6F6' },
        danger:  { DEFAULT: '#B54A3A', light: '#FBF0EE' },
        warn:    { DEFAULT: '#B8860B', light: '#FFF8E7' },
        ok:      { DEFAULT: '#3D8B5E', light: '#ECF7F0' },
        bdr:     { DEFAULT: '#E0DBD4', 2: '#D0CAC0' },
      },
      fontFamily: {
        sans:  ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
      },
      boxShadow: {
        DEFAULT: '0 1px 3px rgba(44,37,32,.06), 0 4px 12px rgba(44,37,32,.04)',
        lg:      '0 4px 12px rgba(44,37,32,.08), 0 16px 40px rgba(44,37,32,.08)',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateX(-50%) translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.4s ease',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
