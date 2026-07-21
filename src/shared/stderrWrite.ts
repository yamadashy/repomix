/**
 * Writes a line to stderr, bypassing the logger (which routes most levels to
 * stdout). Used by flows whose output must never mix into `--stdout` packed
 * output, such as the remote-config trust prompt.
 */
export const writeStderrLine = (line = ''): void => {
  process.stderr.write(`${line}\n`);
};
