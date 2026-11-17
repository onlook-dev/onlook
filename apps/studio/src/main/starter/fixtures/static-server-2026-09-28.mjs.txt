import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, realpathSync, statSync, watch } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const REAL_ROOT = realpathSync(ROOT);
const PORT = Number(process.env.PORT);
if (!Number.isInteger(PORT) || PORT <= 0) {
  console.error('PORT must be set to the port to listen on');
  process.exit(2);
}

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
  if (pathname.includes('\0')) return undefined;
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
  return LOCAL_HOSTS.has(host.replace(/:\d+$/, '').toLowerCase());
}

const RELOAD_PATH = "/__reload";
const RELOAD_CLIENT = "<script>(function connect() { var socket = new WebSocket('ws://' + location.host + '/__reload'); socket.onmessage = function () { location.reload(); }; socket.onclose = function () { setTimeout(connect, 1000); }; })();</script>";
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
    'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' +
      accept +
      '\r\n\r\n',
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

let pending;
function changed(name) {
  if (name && String(name).split(sep).some((segment) => segment.startsWith('.') || segment === 'node_modules')) return;
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

const parentPort =
  process.parentPort ??
  (typeof process.send === 'function'
    ? { on: (_event, listener) => process.on('message', (data) => listener({ data })) }
    : undefined);
if (parentPort) {
  let deadline;
  const arm = (windowMs) => {
    clearTimeout(deadline);
    deadline = setTimeout(() => process.exit(3), windowMs);
  };
  arm(15000);
  parentPort.on('message', (event) => {
    const message = event.data;
    if (message && message.type === 'heartbeat' && Number.isFinite(message.windowMs)) {
      arm(message.windowMs);
    }
  });
}
