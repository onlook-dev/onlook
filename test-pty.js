const pty = require("node-pty");
const os = require("os");
try {
  const term = pty.spawn("bash", [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: process.env.HOME
  });
  console.log("PTY created successfully in project context");
  term.kill();
} catch (e) {
  console.error("PTY creation failed:", e);
  process.exit(1);
}
