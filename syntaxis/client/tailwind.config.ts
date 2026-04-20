import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        fraunces: ['Fraunces', 'Georgia', 'serif'],
        caveat: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
} satisfies Config;
