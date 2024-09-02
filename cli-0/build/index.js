#!/usr/bin/env node
import { Command as r } from "commander";
function e() {
  const o = new r();
  return o.name("onlook").description("The Onlook CLI").version("0.0.0"), o.command("setup").description("Set up the current project with Onlook").action(() => {
    console.log("Hello, World!");
  }), o;
}
process.env.NODE_ENV !== "test" && e().parse(process.argv);
export {
  e as createProgram
};
