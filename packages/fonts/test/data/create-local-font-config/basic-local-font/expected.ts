export const customFont = localFont({
  src: [{
    path: "./fonts/custom-regular.woff2",
    weight: "400",
    style: "normal"
  }, {
    path: "./fonts/custom-bold.woff2",
    weight: "700",
    style: "normal"
  }],
  variable: "--font-custom-font",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  preload: true
}); 