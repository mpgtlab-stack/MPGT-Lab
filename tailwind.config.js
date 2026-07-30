/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "brand-green": "#61ac44",
        "brand-greenDark": "#4e8a36",
        "brand-blue": "#0f6097",
        "brand-blueLight": "#1e73aa",
      },
    },
  },
  plugins: [],
};
