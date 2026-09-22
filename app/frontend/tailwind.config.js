/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Fira Sans"', 'sans-serif'],
      },
      colors: {
        // Paleta Corporativa Librería Oskar
        oskar: {
          gold:    '#e8c85e', // dorado para títulos y resaltados
          bronze:  '#b07c19', // dorado leve para hovers de botones y filtros
          amber:   '#e19922', // dorado cálido para acentos/CTAs activos
          dark:    '#252525', // negro/gris oscuro para tipografías principales
          light:   '#f3f3f3', // fondo general claro
        },
      },
    },
  },
  plugins: [],
}
