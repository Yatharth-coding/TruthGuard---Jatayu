/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#f0f3f9', 100: '#d9e0f0', 200: '#b3c1e0', 300: '#8da2d1', 400: '#6683c1', 500: '#4064b2', 600: '#33508e', 700: '#263c6b', 800: '#1a2847', 900: '#0d1424' },
        brand: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
      },
    },
  },
  plugins: [],
};
