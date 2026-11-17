// Every exit goes through `exitAfter`: a pipe write is asynchronous on macOS, so `process.exit`
// right after `stdout.write` truncates the chunk the parser is waiting for (ONL-2186).
export const CLAUDE_SHIM_SOURCE = `
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const statePath = process.env.STUDIO_CLAUDE_SHIM_STATE ?? '';
const loginMode = process.env.STUDIO_CLAUDE_SHIM_LOGIN ?? 'loopback';
const [command, sub, ...rest] = process.argv.slice(2);

const LOGIN_PROMPT =
  'Opening browser to sign in…\\n' +
  "If the browser didn't open, visit: https://platform.claude.com/oauth/authorize?state=shim\\n" +
  'Paste code here if prompted > ';
const INVALID_CODE = 'Invalid code. Please make sure the full code was copied.\\n';
const SERVER_REJECT = 'Login failed: Request failed with status code 400\\n';

process.on('SIGTERM', () => process.exit(143));

function exitAfter(stream, text, code) {
  if (text === '') {
    process.exit(code);
    return;
  }
  stream.write(text, () => process.exit(code));
}

function readState() {
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return { state: 'failed' };
  }
}

function writeSignedIn() {
  writeFileSync(statePath, JSON.stringify({ ...readState(), state: 'signed-in' }));
}

function status() {
  const current = readState();
  if (current.state === 'signed-in') {
    const body = {
      loggedIn: true,
      authMethod: 'claude.ai',
      apiProvider: 'firstParty',
      email: typeof current.email === 'string' ? current.email : null,
      orgId: null,
      orgName: null,
      subscriptionType: typeof current.plan === 'string' ? current.plan : 'max',
    };
    exitAfter(process.stdout, JSON.stringify(body) + '\\n', 0);
    return;
  }
  if (current.state === 'signed-out') {
    exitAfter(process.stdout, JSON.stringify({ loggedIn: false, authMethod: 'none', apiProvider: 'firstParty' }) + '\\n', 1);
    return;
  }
  exitAfter(process.stdout, '', 2);
}

function login() {
  if (statePath !== '') appendFileSync(join(dirname(statePath), 'login.log'), process.argv.slice(2).join(' ') + '\\n');
  process.stdout.write(LOGIN_PROMPT);
  if (loginMode === 'loopback') {
    setTimeout(() => {
      writeSignedIn();
      exitAfter(process.stdout, '', 0);
    }, 300);
    return;
  }

  let lines = 0;
  let pending = '';
  let done = false;
  const onLine = () => {
    if (done) return;
    lines += 1;
    if (loginMode === 'server-reject') {
      done = true;
      exitAfter(process.stderr, SERVER_REJECT, 1);
      return;
    }
    if (loginMode === 'paste-invalid' && lines === 1) {
      process.stderr.write(INVALID_CODE);
      return;
    }
    done = true;
    writeSignedIn();
    exitAfter(process.stdout, '', 0);
  };
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    pending += chunk;
    let at = pending.indexOf('\\n');
    while (at !== -1) {
      pending = pending.slice(at + 1);
      onLine();
      at = pending.indexOf('\\n');
    }
  });
  process.stdin.on('end', () => {
    if (!done) exitAfter(process.stdout, '', 1);
  });
}

if (command === 'auth' && sub === 'status' && rest.includes('--json')) status();
else if (command === 'auth' && sub === 'login') login();
else exitAfter(process.stdout, '', 2);
`.trimStart();
