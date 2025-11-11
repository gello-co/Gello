/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/views/**/*.{hbs,html,js}", "./src/public/**/*.{html,js}"],
  theme: {
    extend: {
      // Bootstrap-compatible colors and spacing
      colors: {
        primary: "#0d6efd", // Bootstrap primary
        secondary: "#6c757d",
        success: "#198754",
        danger: "#dc3545",
        warning: "#ffc107",
        info: "#0dcaf0",
      },
    },
  },
  plugins: [],
};
