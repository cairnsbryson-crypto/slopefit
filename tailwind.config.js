/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        /* Headings. The webfont is requested from index.html so the browser
           starts fetching it during HTML parse rather than after React
           renders. Everything after "Barlow Condensed" is what shows while
           that request is in flight, or forever if Google Fonts is blocked:
           condensed system faces first, then a plain sans. The important part
           is that the chain ends in sans-serif - a bare `font-family:
           Barlow Condensed` falls all the way back to the browser's default
           serif, which is not this brand. */
        display: [
          '"Barlow Condensed"',
          '"Oswald"',
          '"Arial Narrow"',
          '"Helvetica Neue Condensed"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
