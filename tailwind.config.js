/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        igss: {
          900: '#0A3D0C',
          800: '#1B5E20',
          700: '#2E7D32',
          600: '#388E3C',
          500: '#43A047',
          400: '#66BB6A',
          300: '#A5D6A7',
          200: '#C8E6C9',
          100: '#E8F5E9',
          50: '#F1F8F1',
          red: '#C41E24',
          'red-dark': '#8E1519',
          'red-light': '#EF5350',
          gold: '#BFA033',
          'gold-dark': '#8B7424',
          brown: '#5D4037',
        },
        sfyc: {
          rojo: '#DC2626',
          amarillo: '#F59E0B',
          verde: '#16A34A',
          azul: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        igss: '0 4px 12px rgba(46, 125, 50, 0.15)',
        sfyc: '0 4px 12px rgba(34, 99, 35, 0.1)',
      },
      keyframes: {
        watermarkRotate: {
          '0%, 100%': { opacity: '0.05' },
          '50%': { opacity: '0.1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'watermark-rotate': 'watermarkRotate 4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
