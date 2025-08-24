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
        xl: "14px", 
        "2xl": "18px",
        full: "999px"
      },
      boxShadow: {
        xs: "0 1px 2px rgba(10,15,25,.08)",
        md: "0 8px 24px rgba(10,15,25,.08)"
      },
      colors: {
        brand: { 600: "#1A73E8", 700: "#1557B0" },        // Google blue
        brandTint: { DEFAULT: "#E8F0FE" },                // soft blue tint
        surface: { DEFAULT: "#F7F9FC" },                  // page bg
        panel:   { DEFAULT: "#FFFFFF" },                  // shells/cards
        card: {
          normal: "rgba(255,255,255,0.92)",
          highlight: "#E8F0FE",
          avoid: "rgba(15,17,21,0.92)"
        },
        text: { onLight: "#0B1320", onDark: "#E6EAF2" },
        divider: "rgba(11,19,32,0.10)"
      },
    },
  },
};
