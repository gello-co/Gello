/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./ProjectSourceCode/src/views/**/*.{hbs,html,js}",
    "./ProjectSourceCode/src/public/**/*.{html,js}",
  ],
  plugins: [require("@tailwindcss/forms")],
};
