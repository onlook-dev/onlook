export const myCustomFont = localFont({
  src: [{
    path: "./fonts/my-custom-font-regular.woff2",
    weight: "400",
    style: "normal"
  }, {
    path: "./fonts/my-custom-font-bold.woff2",
    weight: "700",
    style: "normal"
  }, {
    path: "./fonts/my-custom-font-italic.woff2",
    weight: "400",
    style: "italic"
  }],
  variable: "--font-my-custom-font",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  preload: true
}); 