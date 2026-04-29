import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['EB Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Used selectively for the new editorial lines (subtagline, social
        // proof, footer motto). Existing serif text stays in EB Garamond.
        fraunces: ['Fraunces', 'EB Garamond', 'Georgia', 'serif'],
      },
      colors: {
        // Cream palette — replaces gold as the primary UI accent. Gold
        // (#c9a84c) is reserved for the wordmark and the About left-rule.
        cream: '#e8e3d4',
        'cream-hover': '#f0ebdc',
        'cream-muted': '#a89e8a',
      },
    },
  },
  plugins: [],
} satisfies Config;
