import { execFileSync, spawn } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stopPid } from './launch.js';

/** Canvas probes aim at these ids. */
export const FIXTURE_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Companion</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      html { background: #090909; color: #f1f1ef; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
      a { color: inherit; text-decoration: none; }
      button { font: inherit; color: inherit; }
      #title { margin: 0; text-wrap: balance; font-family: Georgia, "Times New Roman", serif; font-weight: 400; color: #c6c6c4; }
      .rule { height: 0.5px; width: 11px; background: #777; }
      #lede { margin: 0; color: #b2b2b0; }
      .desk { position: relative; overflow: hidden; background: linear-gradient(90deg, #111211, #181917 50%, #121311); }
      .scene { position: absolute; left: 0; top: 0; width: 321px; height: 260px; }
      .scene div { position: absolute; }
      .label { font-size: 8.5px; font-weight: 500; line-height: 13px; letter-spacing: 1.3px; text-transform: uppercase; color: #a7a7a4; }
      .when { margin-top: 3px; color: #92928f; }
      .project { display: flex; align-items: center; justify-content: space-between; border: 0.5px solid #363634; background: #101010; color: #aaa; }
      .project .name { display: block; color: #eee; }
      .project .ref { display: block; color: #898986; }
      .project .dot { padding: 0 3px; }
      #wake { display: flex; width: 100%; align-items: center; justify-content: center; border: 0.5px solid #20201f; background: #191919; font-weight: 500; cursor: pointer; }
      .cloud { display: table; margin: 0 auto; color: #eee; }
      body { min-height: 100vh; display: grid; place-items: center; padding: 48px 0; }
      .device { position: relative; width: 403px; height: 884px; border-radius: 63px; border: 1px solid #2e2e2e; background: linear-gradient(115deg, #202020 0%, #0a0a0a 17%, #131313 70%, #353535 100%); padding: 4px; }
      .device::before { content: ""; position: absolute; inset: 4px; border-radius: 59px; border: 0.5px solid #050505; background: #020202; }
      .key { position: absolute; width: 3px; background: #171717; }
      .key.l { left: -3px; border-left: 1px solid #333; border-radius: 2px 0 0 2px; }
      .key.r { right: -3px; width: 2px; border-right: 1px solid #444; background: #1a1a1a; border-radius: 0 2px 2px 0; }
      .screen { position: absolute; left: 13px; top: 11px; width: 375px; height: 860px; overflow: hidden; border-radius: 51px; background: #090909; }
      .screen > * { position: absolute; }
      .status { left: 39px; right: 23px; top: 17px; height: 22px; display: flex; align-items: center; justify-content: space-between; }
      .status .time { font-size: 14px; font-weight: 600; letter-spacing: -0.5px; }
      .status .icons { display: flex; align-items: center; gap: 5px; }
      .battery { position: relative; margin-left: 1px; width: 20px; height: 10px; border-radius: 2px; border: 0.7px solid #b0b0b0; padding: 1px; }
      .battery::before { content: ""; display: block; height: 100%; width: 16px; border-radius: 0.5px; background: #f4f4f4; }
      .battery::after { content: ""; position: absolute; right: -2px; top: 3px; width: 1px; height: 3px; border-radius: 0 1px 1px 0; background: #888; }
      .bar { left: 21px; right: 22px; top: 49px; height: 29px; display: flex; align-items: center; justify-content: flex-end; }
      .bar .gear { display: flex; width: 23px; height: 23px; align-items: center; justify-content: center; color: #aaa; }
      main { left: 27px; right: 27px; top: 124px; }
      #title { max-width: 270px; font-size: 34px; line-height: 36px; letter-spacing: -1.25px; }
      .rule { margin-top: 13px; }
      #lede { margin-top: 14px; max-width: 245px; font-size: 13px; line-height: 19px; letter-spacing: -0.2px; }
      .desk { margin-top: 22px; height: 260px; border-radius: 6px 6px 0 0; }
      .sync { margin-top: 18px; }
      .when { font-size: 12px; line-height: 17px; letter-spacing: -0.1px; }
      .project { margin-top: 16px; height: 58px; border-radius: 10px; padding: 0 14px; }
      .project .name { font-size: 13px; line-height: 20px; letter-spacing: -0.25px; }
      .project .ref { font-size: 11px; line-height: 17px; }
      #wake { margin-top: 18px; height: 45px; border-radius: 10px; font-size: 14px; letter-spacing: -0.35px; }
      .cloud { margin-top: 9px; padding: 2px 12px; font-size: 13px; line-height: 20px; letter-spacing: -0.25px; }
      .tabs { left: 0; right: 0; top: 776px; height: 62px; border-top: 0.5px solid #242424; background: #090909; display: flex; align-items: flex-start; justify-content: space-between; padding: 12px 18px 0; }
      .tabs a { display: flex; width: 57px; flex-direction: column; align-items: center; gap: 5px; color: #858582; font-size: 9.5px; letter-spacing: -0.2px; }
      .tabs a[aria-current] { color: #f2f2ef; }
      @media (max-width: 440px) {
        body { display: block; padding: 0; }
        .device { width: 100%; height: 860px; border: 0; border-radius: 0; background: none; padding: 0; }
        .device::before, .key { display: none; }
        .screen { left: 0; top: 0; width: 100%; border-radius: 0; }
      }
      .home { left: calc(50% - 67px); top: 846px; width: 134px; height: 5px; border-radius: 3px; background: #f4f4f1; }
    </style>
  </head>
  <body>
    <div class="device">
      <div class="key l" style="top:132px;height:31px"></div>
      <div class="key l" style="top:187px;height:54px"></div>
      <div class="key l" style="top:258px;height:52px"></div>
      <div class="key r" style="top:205px;height:87px"></div>
      <div class="screen">
        <div class="status"><span class="time">9:41</span><span class="icons"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Full signal"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Wi-Fi connected"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg><span class="battery" role="img" aria-label="Battery full"></span></span></div>
        <header class="bar"><a class="gear" href="/settings" aria-label="Open settings"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg></a></header>
        <main>
          <h1 id="title">Your computer has gone to sleep</h1>
          <div class="rule"></div>
          <p id="lede">Onlook is offline. Your projects are paused until your computer wakes.</p>
          <div class="desk" role="img" aria-label="A quiet desk with a sleeping laptop, an empty chair, and a desk lamp">
            <div class="scene">
              <div style="left:61px;top:-7px;width:96px;height:100px;border:3px solid #0b0c0b;background:#171816"><div style="left:15px;top:13px;width:60px;height:60px;border-radius:50%;background:#090a09"></div></div>
              <svg style="position:absolute;right:39px;top:53px" width="100" height="128" viewBox="0 0 100 128" fill="none" aria-hidden="true">
                <path d="M61 112 L68 47 L43 19 L34 18" stroke="#080908" stroke-width="2.4"/>
                <circle cx="68" cy="47" r="3" fill="#080908"/>
                <path d="M30 3 L38 5 L35 25 L27 23 Z" fill="#090a09"/>
                <path d="M26 20 Q13 30 10 45 L42 53 Q47 37 36 24 Z" fill="#0a0b0a"/>
                <path d="M10 45 L42 53" stroke="#44453f" stroke-width="0.8"/>
                <path d="M49 114 Q65 110 78 114 L78 119 L49 119 Z" fill="#090a09" stroke="#20211e" stroke-width="0.5"/>
              </svg>
              <div style="left:13px;right:16px;top:166px;height:9px;transform:skewX(-35deg);background:#0b0c0b"></div>
              <div style="left:0;right:0;top:174px;height:12px;border-top:0.5px solid #30312d;border-bottom:0.5px solid #30312d;background:#20211e"></div>
              <div style="left:0;right:0;top:181px;height:4px;background:#151613"></div>
              <div style="left:0;right:0;top:191px;height:8px;background:#090a09"></div>
              <div style="left:7px;top:198px;width:7px;height:65px;transform:skewX(-6deg);background:#0a0b0a"></div>
              <div style="right:7px;top:198px;width:7px;height:65px;transform:skewX(6deg);background:#0a0b0a"></div>
              <div style="left:100px;top:111px;width:88px;height:59px;border-radius:2px;border:0.8px solid #393a35;background:#080908"></div>
              <div style="left:87px;top:171px;width:114px;height:6px;border-radius:0 0 7px 7px;border-bottom:1px solid #34352f;background:#111210"></div>
              <div style="left:48px;top:151px;width:17px;height:22px;border-radius:0 0 2px 2px;background:#090a09"></div>
              <div style="left:51px;top:136px;width:2px;height:23px;transform:rotate(-12deg);background:#090a09"></div>
              <div style="left:57px;top:135px;width:2px;height:24px;transform:rotate(5deg);background:#090a09"></div>
              <div style="left:61px;top:139px;width:2px;height:19px;transform:rotate(17deg);background:#090a09"></div>
              <div style="right:47px;top:158px;width:18px;height:21px;border-radius:0 0 3px 3px;border-top:0.7px solid #353631;background:#0a0b0a"></div>
              <div style="left:60px;bottom:-22px;width:134px;height:104px;border-radius:32px 32px 0 0;border-top:1px solid #3b3c35;background:#090a09"></div>
              <div style="left:42px;bottom:23px;width:25px;height:10px;border-radius:50%;background:#080908"></div>
              <div style="left:189px;bottom:25px;width:18px;height:9px;border-radius:50%;background:#080908"></div>
              <div style="inset:0;background:linear-gradient(180deg,transparent 50%,#09090955 100%)"></div>
            </div>
          </div>
          <div class="sync"><div class="label">Last sync</div><div class="when">Yesterday at 11:32 PM</div></div>
          <a id="project" class="project" href="/projects/checkout-flow"><span><span class="name">Checkout Flow</span><span class="ref">main <span class="dot">·</span> 8f3c2d1</span></span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></a>
          <button id="wake" type="button">Wake Computer</button>
          <a class="cloud" href="/cloud">Use Cloud Instead</a>
        </main>
        <nav class="tabs" aria-label="Main navigation"><a href="/" aria-current="page"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg><span>Projects</span></a><a href="/activity"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg><span>Activity</span></a><a href="/notifications"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg><span>Notifications</span></a><a href="/settings"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg><span>Settings</span></a></nav>
        <div class="home"></div>
      </div>
    </div>
  </body>
</html>
`;

const SERVER = `const http = require('node:http');
const page = require('node:path').join(__dirname, 'index.html');
http
  .createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
    res.end(require('node:fs').readFileSync(page));
  })
  .listen(0, function () {
    console.log('Listening on http://localhost:' + this.address().port);
  });
`;

export interface FixtureSite {
  path: string;
  root: string;
}

/** Outside any checkout by default: the in-product agent loads every instruction file above its cwd. */
export function makeFixtureSite(options: { root?: string; name?: string } = {}): FixtureSite {
  if (options.root !== undefined) mkdirSync(options.root, { recursive: true });
  const root = realpathSync(mkdtempSync(join(options.root ?? tmpdir(), 'studio-site-')));
  const path = join(root, options.name ?? 'companion-app');
  mkdirSync(path);
  writeFileSync(
    join(path, 'package.json'),
    `${JSON.stringify({ name: options.name ?? 'companion-app', private: true, scripts: { dev: 'node server.js' } }, null, 2)}\n`,
  );
  writeFileSync(join(path, 'server.js'), SERVER);
  writeFileSync(join(path, 'index.html'), FIXTURE_PAGE);
  writeFileSync(join(path, 'README.md'), '# Companion App\n\nRun `npm run dev` to start the site.\n');
  const git = (...args: string[]): void => {
    execFileSync('git', args, {
      cwd: path,
      stdio: 'ignore',
      env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' },
    });
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'fixture@example.com');
  git('config', 'user.name', 'Fixture User');
  git('add', '.');
  git('commit', '-qm', 'companion app');
  return { path, root };
}

export interface ServedSite {
  url: string;
  port: number;
  pid: number;
  stop(): Promise<void>;
}

// A named port is swapped in at `listen`, not read by `server.js`: the in-product agent reads the source and uses any knob it finds.
const WATCHED = `const owner = Number(process.env.FIXTURE_SITE_OWNER);
const port = Number(process.env.FIXTURE_SITE_PORT);
if (port > 0) {
  const { Server } = require('node:http');
  const listen = Server.prototype.listen;
  Server.prototype.listen = function (_port, ...rest) {
    return listen.call(this, port, ...rest);
  };
}
setInterval(() => {
  try {
    process.kill(owner, 0);
  } catch {
    process.exit(0);
  }
}, 500);
require(process.env.FIXTURE_SITE_SERVER);
`;

/** Alive until `stop()` or until `owner` exits; a launched app's pid as `owner` lets the site outlive the calling script. */
export async function serveFixtureSite(
  site: FixtureSite,
  { owner = process.pid, port: asked, limitMs = 10_000 }: { owner?: number; port?: number; limitMs?: number } = {},
): Promise<ServedSite> {
  const outputPath = join(mkdtempSync(join(site.root, 'serve-')), 'output.log');
  const sink = openSync(outputPath, 'a');
  const child = spawn(process.execPath, ['-e', WATCHED], {
    cwd: site.path,
    env: {
      ...process.env,
      FIXTURE_SITE_OWNER: String(owner),
      FIXTURE_SITE_SERVER: join(site.path, 'server.js'),
      FIXTURE_SITE_PORT: String(asked ?? 0),
    },
    stdio: ['ignore', sink, sink],
    detached: true,
  });
  child.unref();
  closeSync(sink);
  const pid = child.pid;
  if (pid === undefined) throw new Error(`The fixture server did not start under ${site.path}.`);
  const exited = new Promise<number | null>((resolve) => child.once('exit', resolve));
  const printed = (): number | undefined => {
    const match = /localhost:(\d+)/.exec(readFileSync(outputPath, 'utf8'));
    return match ? Number(match[1]) : undefined;
  };
  let port: number | undefined;
  const deadline = Date.now() + limitMs;
  while ((port = printed()) === undefined) {
    const code = await Promise.race([exited, new Promise<'waiting'>((resolve) => setTimeout(() => resolve('waiting'), 100))]);
    if (code !== 'waiting' || Date.now() >= deadline) {
      await stopPid(pid);
      const why = code === 'waiting' ? `printed no port within ${String(limitMs / 1000)}s` : `exited ${String(code)} before listening`;
      throw new Error(`The fixture server ${why}: ${readFileSync(outputPath, 'utf8')}`);
    }
  }
  return { url: `http://localhost:${String(port)}/`, port, pid, stop: () => stopPid(pid) };
}
