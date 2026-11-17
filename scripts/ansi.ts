export const bold = (s: string): string => `\x1b[1m${s}\x1b[0m`;
export const dim = (s: string): string => `\x1b[2m${s}\x1b[0m`;
export const green = (s: string): string => `\x1b[32m${s}\x1b[0m`;
export const yellow = (s: string): string => `\x1b[33m${s}\x1b[0m`;
export const red = (s: string): string => `\x1b[31m${s}\x1b[0m`;

export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

export function banner(lines: string[], color: (s: string) => string): void {
  const width = Math.max(...lines.map((l) => stripAnsi(l).length)) + 4;
  const bar = '─'.repeat(width);
  console.log('');
  console.log(color(`┌${bar}┐`));
  for (const line of lines) {
    const pad = ' '.repeat(width - stripAnsi(line).length - 4);
    console.log(`${color('│')}  ${line}${pad}  ${color('│')}`);
  }
  console.log(color(`└${bar}┘`));
  console.log('');
}
