/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Graphite — the base. Everything dark derives from this hue family,
        // never pure black, so glass surfaces always have a warm-neutral tint.
        graphite: {
          950: '#15161A',
          900: '#1B1C21',
          800: '#25272C',
          700: '#2E3037',
          600: '#3A3D45',
          500: '#4A4E58',
          400: '#6B707C',
          300: '#9498A3'
        },
        // Sky Mint — the accent. Lightens up and out of the graphite.
        mint: {
          950: '#173B33',
          900: '#1F5245',
          700: '#3C8F73',
          500: '#7FE0BE',
          400: '#B8F7E4',
          300: '#CDFAEC',
          200: '#E2FCF4',
          100: '#F0FDF9'
        },
        ink: '#EAF6F2',
        canvas: '#1B1C21',
        panel: 'rgba(37, 39, 44, 0.55)',
        line: 'rgba(184, 247, 228, 0.14)',
        amber: {
          400: '#F0C177',
          500: '#E3A94E',
          700: '#B8842E'
        },
        clay: '#E38A78'
      },
      fontFamily: {
        display: ['"Fraunces"', '"Space Grotesk"', 'serif'],
        body: ['"Manrope"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      backdropBlur: {
        xs: '2px'
      },
      boxShadow: {
        glass: '0 1px 1px rgba(184,247,228,0.06) inset, 0 8px 32px -8px rgba(0,0,0,0.55)',
        glow: '0 0 0 1px rgba(184,247,228,0.15), 0 0 40px -8px rgba(184,247,228,0.35)'
      },
      backgroundImage: {
        'mesh': 'radial-gradient(60% 50% at 15% 10%, rgba(184,247,228,0.14), transparent 60%), radial-gradient(50% 45% at 90% 15%, rgba(127,224,190,0.10), transparent 55%), radial-gradient(70% 60% at 50% 100%, rgba(31,82,69,0.25), transparent 60%)'
      }
    }
  },
  plugins: []
};