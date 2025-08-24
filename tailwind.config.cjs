/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html","./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['24px', { lineHeight: '32px' }],
      },
      spacing: {
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
      },
      borderRadius: {
        xl: "10px",
        "2xl": "12px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.06)",
      },
      colors: {
        brand: {
          600: "#4F46E5",
          700: "#4338CA",
        },
        surface: "#FFFFFF",
        panel: {
          DEFAULT: "#F8FAFC",
          dark: "#0F1115",
        },
        card: {
          normal: "#FFFFFF",
          highlight: "#FFF4D6",
          avoid: "#111317",
        },
        text: {
          onLight: "#111827",
          onDark: "#E5E7EB",
        },
        divider: "#E5E7EB",
        intent: {
          success: "#10B981",
          warn: "#F59E0B",
          danger: "#EF4444",
        },
      },
    },
  },
};
