/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: "class",
  theme: {
    extend: {
      animation: {
        "auth-gradient": "auth-gradient 12s ease infinite",
        "blob-1": "blob-float 20s ease-in-out infinite",
        "blob-2": "blob-float 18s ease-in-out infinite 2s",
        "blob-3": "blob-float 22s ease-in-out infinite 4s",
      },
      keyframes: {
        "auth-gradient": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "blob-float": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -30px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.95)" },
        },
      },
      backgroundSize: {
        "auth-gradient": "200% 200%",
      },
    },
  },
  plugins: [],
};
