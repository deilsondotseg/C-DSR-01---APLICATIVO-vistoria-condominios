import { spawn } from "node:child_process";
import process from "node:process";

const commands = [
  [process.execPath, ["server.js"]],
  [process.execPath, ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0"]],
];

const children = commands.map(([command, args]) => spawn(command, args, { stdio: "inherit", windowsHide: false }));

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

for (const child of children) {
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) process.exitCode = code;
    stopChildren();
  });
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(0);
});
