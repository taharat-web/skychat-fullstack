/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // SkyChat's palette: a deep teal-black canvas with a signature
        // green accent, in the spirit of a familiar messaging app but with
        // its own hue and its own signature mark (see Logo.jsx).
        app: {
          bg: '#0B141A',
          panel: '#111B21',
          elevated: '#202C33',
          hover: '#2A3942',
          border: '#2A3942',
        },
        accent: {
          DEFAULT: '#00A884',
          strong: '#06CF9C',
          deep: '#005C4B',
          soft: '#0B4A3F',
        },
        ink: {
          primary: '#E9EDEF',
          secondary: '#8696A0',
          muted: '#5B6B73',
        },
        danger: {
          DEFAULT: '#F15C6D',
          soft: '#3B2429',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 2px 12px rgba(0, 0, 0, 0.35)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        blink: {
          '0%, 80%, 100%': { opacity: 0.2 },
          '40%': { opacity: 1 },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.18s ease-out',
        blink: 'blink 1.4s infinite both',
      },
    },
  },
  plugins: [],
};
