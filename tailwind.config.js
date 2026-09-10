export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ng: {
          green: '#008751', dark: '#006B40', light: '#00A86B',
          pale: '#E8F5EE', black: '#0a1f12',
        },
      },
      fontFamily: {
        sans: ['DM Sans','system-ui','sans-serif'],
        mono: ['DM Mono','monospace'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseGreen: { '0%,100%': { boxShadow: '0 0 0 0 rgba(0,135,81,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(0,135,81,0)' } },
      },
    },
  },
  plugins: [],
}
