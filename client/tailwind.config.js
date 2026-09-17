/**
 * ==============================================================================
 * CONFIGURACIÓN DE TAILWIND CSS - MateRun
 * ==============================================================================
 * Personalización del tema con los colores exactos definidos en la referencia:
 * - Blanco Porcelana (Fondo principal): #FFFCF4
 * - Rojo Machine (Acentos, botones principales, navbar): #FF2E3A
 * - Gris Pizarra (Textos secundarios, bordes, botones cancelar): Tailwind Slate
 * ==============================================================================
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        porcelain: '#FFFCF4',
        machine: {
          DEFAULT: '#FF2E3A',
          hover: '#E0222D', // Un tono ligeramente más oscuro para el estado hover
          light: '#FFEAEB', // Un fondo rojizo muy claro para estados activos o errores
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
