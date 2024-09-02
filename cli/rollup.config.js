import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import commonjs from "rollup-plugin-commonjs";

export default {
  input: "src/index.ts",
  output: {
    file: "build/index.cjs",
    format: "cjs"
  },
  plugins: [
    typescript(),
    nodeResolve(
      {
        preferBuiltins: true
      }
    ),
    commonjs(),
    json(),
    terser()
  ],
};
