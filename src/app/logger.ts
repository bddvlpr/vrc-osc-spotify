import os from "os";

const log = (message: unknown, newline = true) => {
  if (!newline) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }
  process.stdout.write(`${message}${newline ? os.EOL : ""}`);
};

export { log };
