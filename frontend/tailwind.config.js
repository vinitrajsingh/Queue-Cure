/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        clinic: {
          bg: '#f5f3ee',
          surface: '#ffffff',
          ink: '#1f2a2e',
          muted: '#5d6b6f',
          line: '#e3ded5'
        },
        teal: {
          50: '#edf6f4',
          100: '#d3e9e4',
          200: '#a7d3cb',
          300: '#6fb6aa',
          400: '#3f978a',
          500: '#2c7a6e',
          600: '#236258',
          700: '#1d4f47'
        },
        alert: {
          50: '#fbeceb',
          100: '#f6d2cf',
          500: '#c0392b',
          600: '#a32b1f'
        },
        warn: {
          100: '#fdf0cf',
          500: '#c89324',
          600: '#a87a16'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
};
