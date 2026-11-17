import { join } from 'node:path';
import { writeAtomicFile } from '../../fs-atomic.js';
import { STARTER_BACKSTOP_JS, STARTER_PORT_GUARD_JS, STARTER_SERVER_FILE } from '../scaffold.js';
import type { StarterAdapter } from '../adapter.js';

// The page copy is the user's file from the init commit, and main cannot import the renderer's `strings.ts`.
const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New project</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <main>
      <p>
        This is a blank page.<br />
        Use the chat to start designing the page.
      </p>
    </main>
    <script src="/main.js"></script>
  </body>
</html>
`;

const STYLE_CSS = `:root {
  color-scheme: light dark;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.5;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: Canvas;
  color: CanvasText;
}

main {
  padding: 2rem;
  text-align: center;
}

p {
  margin: 0;
  color: #9ca3af;
}
`;

const MAIN_JS = ``;

export const RELOAD_PATH = '/__reload';

// A WebSocket, not a stream held over HTTP/1.1: every frame shares one network session, and Chromium gives a host six HTTP/1.1 connections (ONL-2472).
export const RELOAD_CLIENT_HTML =
  '<script>(function connect() {' +
  ` var socket = new WebSocket('ws://' + location.host + '${RELOAD_PATH}');` +
  ' socket.onmessage = function () { location.reload(); };' +
  ' socket.onclose = function () { setTimeout(connect, 1000); };' +
  ' })();</script>';

// Zero dependencies, and no backticks below (template literal).
const SERVER_MJS = `import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, realpathSync, statSync, watch } from 'node:fs';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const REAL_ROOT = realpathSync(ROOT);
${STARTER_PORT_GUARD_JS}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

// Only files inside ROOT, and never a dotfile: env files are copied into
// this folder and must not be served.
function fileFor(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, 'http://127.0.0.1').pathname);
  } catch {
    return undefined;
  }
  if (pathname.includes('\\0')) return undefined;
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = resolve(ROOT, '.' + pathname);
  const step = relative(ROOT, target);
  if (step === '' || step.startsWith('..') || isAbsolute(step)) return undefined;
  if (step.split(sep).some(denied)) return undefined;
  if (!existsSync(target) || !statSync(target).isFile()) return undefined;
  // A symlink inside ROOT can point anywhere; the lexical check above cannot see that.
  let real;
  try {
    real = realpathSync(target);
  } catch {
    return undefined;
  }
  if (!real.startsWith(REAL_ROOT + sep)) return undefined;
  if (relative(REAL_ROOT, real).split(sep).some(denied)) return undefined;
  return target;
}

function denied(segment) {
  return segment.startsWith('.') || segment === 'node_modules';
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
function isLocalHost(host) {
  if (typeof host !== 'string') return false;
  return LOCAL_HOSTS.has(host.replace(/:\\d+$/, '').toLowerCase());
}

const RELOAD_PATH = ${JSON.stringify(RELOAD_PATH)};
const RELOAD_CLIENT = ${JSON.stringify(RELOAD_CLIENT_HTML)};
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const RELOAD_FRAME = Buffer.concat([Buffer.from([0x81, 6]), Buffer.from('reload')]);
const CLOSE_OPCODE = 0x8;
const CLOSE_FRAME = Buffer.from([0x88, 0]);

const clients = new Set();

function withReloadClient(html) {
  const end = html.toLowerCase().lastIndexOf('</body>');
  return end < 0 ? html + RELOAD_CLIENT : html.slice(0, end) + RELOAD_CLIENT + html.slice(end);
}

const server = createServer((req, res) => {
  // DNS rebinding: a page on another origin can resolve its own name to 127.0.0.1.
  if (!isLocalHost(req.headers.host)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  // Older pages open an EventSource here; a 204 ends it with no reconnect.
  if (req.url === RELOAD_PATH) {
    res.writeHead(204, { 'cache-control': 'no-store' });
    res.end();
    return;
  }
  const file = fileFor(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  if (extname(file) === '.html') {
    res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-store' });
    res.end(withReloadClient(readFileSync(file, 'utf8')));
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (
    !isLocalHost(req.headers.host) ||
    req.url !== RELOAD_PATH ||
    String(req.headers.upgrade).toLowerCase() !== 'websocket' ||
    typeof key !== 'string'
  ) {
    socket.destroy();
    return;
  }
  const accept = createHash('sha1').update(key + WEBSOCKET_GUID).digest('base64');
  socket.on('error', () => clients.delete(socket));
  socket.on('close', () => clients.delete(socket));
  socket.on('data', (chunk) => {
    if ((chunk[0] & 0x0f) !== CLOSE_OPCODE) return;
    clients.delete(socket);
    socket.end(CLOSE_FRAME);
  });
  socket.write(
    'HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: ' +
      accept +
      '\\r\\n\\r\\n',
  );
  clients.add(socket);
});

server.on('error', (error) => {
  console.error('starter could not listen on ' + PORT + ': ' + (error.code ?? error.message));
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('starter ready http://127.0.0.1:' + PORT);
});

const ROOT_NAME = basename(REAL_ROOT);

let pending;
// The watcher names an event on the watched folder itself with its basename, not a path to check (ONL-2943).
function changed(name) {
  if (!name) return;
  const segments = String(name).split(sep);
  if (segments.length === 1 && segments[0] === ROOT_NAME) return;
  if (segments.some(denied)) return;
  clearTimeout(pending);
  pending = setTimeout(() => {
    for (const socket of clients) {
      try {
        socket.write(RELOAD_FRAME);
      } catch {
        clients.delete(socket);
      }
    }
  }, 50);
}
try {
  watch(ROOT, { recursive: true }, (_event, name) => changed(name));
} catch {
  watch(ROOT, (_event, name) => changed(name));
}

${STARTER_BACKSTOP_JS}
`;

export const STATIC_FILES: Readonly<Record<string, string>> = {
  'index.html': INDEX_HTML,
  'style.css': STYLE_CSS,
  'main.js': MAIN_JS,
  [STARTER_SERVER_FILE]: SERVER_MJS,
};

// Rewritten from the template on every spawn, so a project scaffolded by an older build runs today's server (ONL-2472).
export function writeStaticServer(dir: string): string {
  const path = join(dir, STARTER_SERVER_FILE);
  writeAtomicFile(path, SERVER_MJS);
  return path;
}

export const STATIC_ADAPTER: StarterAdapter = {
  id: 'static',
  install: false,
  files: () => STATIC_FILES,
  briefing: (port) =>
    `When this project was opened, Onlook started a starter page for it on port ` +
    `${String(port)} — a small static server, \`server.mjs\`, that Onlook ` +
    "owns. The user does not know it is there: the canvas shows no frame for it until you " +
    'build a page into one, so speak of the page they can see, never of the starter. ' +
    "The page's files are yours to edit freely. When the project needs a real " +
    'dev server — a framework, a build step — start your own on another port and ' +
    'report it with `server_running`; Onlook retires the starter when it hears from ' +
    `you. Port ${String(port)} is taken until then.`,
};
