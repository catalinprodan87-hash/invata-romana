/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens — mirrored as CSS variables in src/index.css.
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
        },
        onPrimary: 'var(--color-on-primary)',
        accent: 'var(--color-accent)',
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        'success-tint': 'var(--color-success-tint)',
        'warning-tint': 'var(--color-warning-tint)',
        'danger-tint': 'var(--color-danger-tint)',
        hairline: 'var(--color-border)',
        'hairline-strong': 'var(--color-border-strong)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      // Type scale (px → rem so the text-size setting can scale everything).
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.4' }], // 12
        sm: ['0.875rem', { lineHeight: '1.45' }], // 14
        base: ['1rem', { lineHeight: '1.5' }], // 16
        lg: ['1.125rem', { lineHeight: '1.5' }], // 18
        xl: ['1.375rem', { lineHeight: '1.35' }], // 22
        '2xl': ['1.75rem', { lineHeight: '1.25' }], // 28
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      // Spacing scale: 4 8 12 16 24 32 48 (Tailwind defaults already cover these).
      minHeight: {
        tap: '44px',
      },
      minWidth: {
        tap: '44px',
      },
    },
  },
  plugins: [],
}
