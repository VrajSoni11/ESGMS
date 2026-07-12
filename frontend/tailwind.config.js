/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B231D',
        canvas: '#F7F5EF',
        panel: '#FFFFFF',
        forest: {
          50: '#EDF3EE',
          100: '#D3E3D6',
          300: '#7FA98A',
          500: '#2F6844',
          700: '#204A31',
          900: '#0F1712'
        },
        amber: {
          400: '#DDA25E',
          500: '#C98A3E',
          700: '#8F5F26'
        },
        clay: '#B75B45',
        line: '#E4E0D6'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,18,0.06), 0 8px 24px -12px rgba(15,23,18,0.15)'
      }
    }
  },
  plugins: []
};
