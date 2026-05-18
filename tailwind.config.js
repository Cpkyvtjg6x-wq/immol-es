/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        background: '#09090B',
        card: '#18181B',
        border: '#27272A',
        accent: {
          DEFAULT: '#10B981',
          foreground: '#ECFDF5',
        },
        accent2: {
          DEFAULT: '#6366F1',
          foreground: '#EEF2FF',
        },
        foreground: '#FAFAFA',
        muted: '#A1A1AA',
        'zinc-950': '#09090B',
        'zinc-900': '#18181B',
        'zinc-800': '#27272A',
        'zinc-700': '#3F3F46',
        'zinc-600': '#52525B',
        'zinc-400': '#A1A1AA',
        'zinc-200': '#E4E4E7',
        'zinc-50': '#FAFAFA',
        emerald: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        indigo: {
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        red: {
          400: '#F87171',
          500: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 0 0 1px #27272A, 0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(16,185,129,0.15)',
        'glow-indigo': '0 0 20px rgba(99,102,241,0.15)',
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out',
        slideUp: 'slideUp 0.4s ease-out',
        scaleIn: 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 40% 20%, #10B98115 0, transparent 50%), radial-gradient(at 80% 0%, #6366F115 0, transparent 50%)',
      },
    },
  },
  plugins: [],
}
