import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,ts,tsx,js,jsx}',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1d4ed8',
          light: '#2563eb',
        },
      },
      boxShadow: {
        'elevated': '0 12px 24px -12px rgba(0,0,0,0.25)',
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config



