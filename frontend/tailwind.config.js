/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── 5-role token system ──────────────────────────────
        bg:      '#08090C',
        surface: '#0F1117',
        border:  '#1C1F2A',
        ink:     '#E8EAF0',
        'ink-dim': '#5A617A',

        // ── Semantic colors ──────────────────────────────────
        primary: {
          DEFAULT: '#3D7BFF',
          dim:     'rgba(61,123,255,0.12)',
          glow:    'rgba(61,123,255,0.25)',
        },
        accent: {
          DEFAULT: '#00D4A0',
          dim:     'rgba(0,212,160,0.12)',
        },
        danger: {
          DEFAULT: '#FF4D6D',
          dim:     'rgba(255,77,109,0.12)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dim:     'rgba(245,158,11,0.12)',
        },

        // ── Legacy aliases (so existing code doesn't break) ──
        brand: {
          300: '#93b8ff',
          400: '#6b9fff',
          500: '#3D7BFF',
          600: '#2d6aee',
          700: '#1d59dd',
        },
        success: {
          400: '#00D4A0',
          500: '#00bd8f',
          600: '#00a67e',
        },
      },

      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Syne', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },

      fontSize: {
        'xs':   ['0.6875rem', { lineHeight: '1rem' }],       // 11px
        'sm':   ['0.8125rem', { lineHeight: '1.25rem' }],    // 13px
        'base': ['0.9375rem', { lineHeight: '1.5rem' }],     // 15px
        'lg':   ['1.125rem',  { lineHeight: '1.75rem' }],    // 18px
        'xl':   ['1.375rem',  { lineHeight: '1.875rem' }],   // 22px
        '2xl':  ['1.75rem',   { lineHeight: '2rem' }],       // 28px
        '3xl':  ['2.25rem',   { lineHeight: '2.5rem' }],     // 36px
        '4xl':  ['3rem',      { lineHeight: '1' }],           // 48px
        '5xl':  ['3.75rem',   { lineHeight: '1' }],           // 60px
      },

      borderRadius: {
        DEFAULT: '8px',
        sm:  '4px',
        DEFAULT: '8px',
        lg:  '8px',        // same as DEFAULT — one value
        xl:  '12px',       // modals only
        '2xl': '16px',
        full: '9999px',
      },

      boxShadow: {
        'glow':       '0 0 0 3px rgba(61, 123, 255, 0.25)',
        'glow-sm':    '0 0 0 2px rgba(61, 123, 255, 0.2)',
        'card':       '0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px rgba(28,31,42,0.8)',
        'modal':      '0 24px 64px rgba(0,0,0,0.6)',
        'float':      '0 8px 32px rgba(0,0,0,0.4)',
      },

      animation: {
        // Page / element entrances
        'fade-in':       'fadeIn 0.35s ease-out both',
        'fade-up':       'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'fade-up-slow':  'fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'slide-down':    'slideDown 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-right':'slideInRight 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in':      'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        'scale-in-fast': 'scaleIn 0.15s cubic-bezier(0.34,1.56,0.64,1) both',

        // Signature: nav indicator
        'nav-indicator': 'navIndicator 0.25s cubic-bezier(0.34,1.56,0.64,1) both',

        // Looping / ambient
        'pulse-slow':    'pulseSlow 3s ease-in-out infinite',
        'shimmer':       'shimmer 1.8s linear infinite',
        'float':         'float 5s ease-in-out infinite',
        'spin-slow':     'spin 8s linear infinite',

        // Number count-up hint
        'count-up':      'countUp 0.6s cubic-bezier(0.22,1,0.36,1) both',

        // Staggered card reveals
        'card-1': 'fadeUp 0.4s 0.05s cubic-bezier(0.22,1,0.36,1) both',
        'card-2': 'fadeUp 0.4s 0.10s cubic-bezier(0.22,1,0.36,1) both',
        'card-3': 'fadeUp 0.4s 0.15s cubic-bezier(0.22,1,0.36,1) both',
        'card-4': 'fadeUp 0.4s 0.20s cubic-bezier(0.22,1,0.36,1) both',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        navIndicator: {
          '0%':   { transform: 'translateY(-50%) scaleY(0)', opacity: '0' },
          '100%': { transform: 'translateY(-50%) scaleY(1)', opacity: '1' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },

      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'shimmer-gradient': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        'primary-gradient': 'linear-gradient(135deg, #3D7BFF 0%, #5B95FF 100%)',
        'accent-gradient':  'linear-gradient(135deg, #00D4A0 0%, #00E8B0 100%)',
        'hero-glow':        'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(61,123,255,0.12) 0%, transparent 70%)',
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
