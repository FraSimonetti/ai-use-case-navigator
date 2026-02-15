import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        risk: {
          high: '#dc2626',
          limited: '#d97706',
          minimal: '#16a34a',
          dependent: '#2563eb',
        },
      },
    },
  },
  plugins: [],
}

export default config
