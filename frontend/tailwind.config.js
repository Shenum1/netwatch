export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#E6F1FB",
          100: "#B5D4F4",
          500: "#378ADD",
          700: "#185FA5",
          900: "#042C53",
        },
        danger: {
          400: "#E24B4A",
          600: "#A32D2D",
        },
        warn: {
          400: "#EF9F27",
          600: "#854F0B",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
