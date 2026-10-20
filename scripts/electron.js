// Starts the desktop app for `pnpm desktop`. VS Code's integrated terminal exports ELECTRON_RUN_AS_NODE=1, which makes
// the Electron binary run as plain Node: no window and no error. The variable is dropped for the child only.
import { spawn } from "node:child_process";
import electron from "electron";

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [".", ...process.argv.slice(2)], { stdio: "inherit", env });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
