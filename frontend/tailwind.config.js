
/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#fc0', // Yandex Yellow
                    hover: '#f5c200',
                },
                dark: {
                    bg: '#19191a',
                    surface: '#242424',
                    border: '#363636'
                }
            },
            boxShadow: {
                'soft': '0 2px 8px rgba(0, 0, 0, 0.05)',
                'float': '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0,0,0,0.04)',
                'modal': '0 8px 32px rgba(0, 0, 0, 0.12)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                'xl': '12px',
                '2xl': '16px',
                '3xl': '24px',
            }
        },
    },
    plugins: [],
}
