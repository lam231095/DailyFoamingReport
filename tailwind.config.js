/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#0052CC',
          600: '#0047b3',
          700: '#003d99',
          800: '#003380',
          900: '#002966',
          950: '#001a40',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease-out forwards',
        'fade-in':    'fadeIn 0.3s ease-out forwards',
        'slide-in':   'slideIn 0.35s cubic-bezier(0.4,0,0.2,1) forwards',
        'scale-in':   'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'spin-slow':  'spin 3s linear infinite',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
      },
      keyframes: {
        fadeUp:    { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideIn:   { '0%': { opacity: 0, transform: 'translateX(-20px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        scaleIn:   { '0%': { opacity: 0, transform: 'scale(0.85)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        pulseRing: {
          '0%':   { transform: 'scale(0.8)', opacity: 0.8 },
          '100%': { transform: 'scale(1.6)', opacity: 0 },
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230052CC' fill-opacity='0.05'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'brand-sm':  '0 2px 8px rgba(0,82,204,0.25)',
        'brand-md':  '0 4px 16px rgba(0,82,204,0.35)',
        'brand-lg':  '0 8px 32px rgba(0,82,204,0.45)',
        'glass':     '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
    },
  },
  plugins: [],
}
