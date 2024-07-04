import json from "@rollup/plugin-json";
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import commonjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";

export default {
  input: "src/index.ts",
  output: {
    file: "build/bundle.cjs",
    format: "cjs"
  },
  plugins: [typescript(), resolve(), commonjs(), json(), terser()],
};
