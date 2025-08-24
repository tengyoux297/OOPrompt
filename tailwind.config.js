/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: { xl: "8px" },
      maxWidth: { panel: "50vw" },         // OOPrompt max width clamp
      colors: {
        card: {
          normal: "#ffffff",
          highlight: "#fff3c4",
          avoid: "#1f2937"
        },
        text: { dark: "#111827", light: "#f9fafb" },
        divider: "#E5E7EB"
      },
      boxShadow: { xs: "0 1px 2px rgba(0,0,0,.05)" }
    }
  },
  plugins: [],
}
