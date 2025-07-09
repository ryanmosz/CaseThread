/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/electron/renderer/**/*.{js,jsx,ts,tsx,html}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace']
      },
      colors: {
        // Legal software theme - professional blue
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe', 
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
    },
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/typography'),
    require('@heroui/react').heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#0ea5e9',
              foreground: '#ffffff'
            },
            focus: '#0ea5e9'
          }
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: '#38bdf8',
              foreground: '#0f172a'
            },
            focus: '#38bdf8'
          }
        }
      }
    })
  ],
}; 