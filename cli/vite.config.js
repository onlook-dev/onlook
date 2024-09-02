import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [],
  root: ".",
  build: {
    lib: {
      entry: path.resolve(__dirname, "index.js"),
      name: "index",
    },
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        // Explicitly set the file name for each format
        entryFileNames: `index.js`,
      },
    },
  },
  resolve: {
    alias: {
      $shared: path.resolve(__dirname, "../shared"),
    },
  },
});
