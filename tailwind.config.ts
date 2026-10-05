import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#14040f',
          900: '#1a0614',
          800: '#2a0b22'
        }
      },
      boxShadow: {
        glow: '0 0 40px rgba(244, 114, 182, 0.35)'
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  }
}
