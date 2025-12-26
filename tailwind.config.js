/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eink: {
          white: '#ffffff',
          light: '#f4f4f4',
          mid: '#a0a0a0',
          dark: '#555555',
          black: '#000000',
        }
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      fontWeight: {
        'thin': 300,
        'normal': 400,
        'medium': 500,
        'semibold': 600,
      },
      letterSpacing: {
        'tight': '-0.02em',
        'tighter': '-0.03em',
      },
      borderRadius: {
        'sm': '2px',
      }
    },
  },
  plugins: [],
}
