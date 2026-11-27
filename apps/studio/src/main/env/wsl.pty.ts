import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { canonicalPath, setCanonicalPathMapper } from '../lib/canonical-path.js';
import { signalGroup, startChild } from './child.js';
import { runCli } from './cli.js';
import { ensureWslEnvironment } from './wsl-env.js';
import { runGit, worktreeGitConfig } from './git.js';
import { systemExecutable } from './platform.js';
import { wslProject, wslWorktreePath } from './wsl.js';

const distro = process.env['WSL_TEST_DISTRO'];

test('WSL runtime uses Linux Git, observes share edits and stops its process group', { skip: process.platform !== 'win32' || !distro, timeout: 90_000 }, async () => {
  const flags = process.env['STUDIO_FLAGS'];
  const linuxRoot = execFileSync(systemExecutable('wsl.exe'), ['-d', distro!, '--exec', '/usr/bin/mktemp', '-d', '/tmp/onlook-wsl-test-XXXXXX'], { encoding: 'utf8' }).trim();
  const root = `\\\\wsl.localhost\\${distro}${linuxRoot.replaceAll('/', '\\')}`;
  const source = join(root, 'project with spaces');
  let workspace: string | undefined;
  try {
    process.env['STUDIO_FLAGS'] = '-wsl-projects';
    assert.equal(wslProject(source), undefined);
    process.env['STUDIO_FLAGS'] = 'wsl-projects';
    setCanonicalPathMapper((path) => wslProject(path)?.hostPath);
    const project = wslProject(source)!;
    await ensureWslEnvironment(root);
    const command = async (bin: string, cwd: string, args: string[]) => {
      const result = await runCli(bin, cwd, args, { timeoutMs: 15_000 });
      assert.ok(result.ok, `${bin}: ${result.err}`);
      return result.out;
    };
    await command('mkdir', root, ['--', project.linuxPath]);
    const git = async (cwd: string, args: string[]) => {
      const result = await runGit(cwd, args, { config: worktreeGitConfig(cwd), timeoutMs: 15_000 });
      assert.ok(result.ok, `git ${args[0]}: ${result.err}`);
      return result.out;
    };
    await git(source, ['init']);
    await writeFile(join(source, 'page.txt'), 'first');
    await git(source, ['add', '.']);
    await git(source, ['-c', 'user.name=Example', '-c', 'user.email=example@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'initial']);
    assert.equal(await git(source, ['rev-parse', '--show-toplevel']), canonicalPath(source));
    assert.equal(canonicalPath(source.replace('wsl.localhost', 'wsl$')), canonicalPath(source));
    workspace = wslWorktreePath(project, 'runtime-test', 'worktree');
    await git(source, ['worktree', 'add', '--detach', workspace]);
    assert.equal(await git(workspace, ['rev-parse', '--show-toplevel']), canonicalPath(workspace));
    assert.equal(await readFile(join(workspace, 'page.txt'), 'utf8'), 'first');
    const envResult = await runCli('node', workspace, ['-e', 'process.stdout.write(JSON.stringify({cwd:process.cwd(),token:process.env.WSL_TEST_VALUE,home:process.env.HOME}))'], { timeoutMs: 15_000, env: { WSL_TEST_VALUE: 'spaces & $() quotes' } });
    assert.ok(envResult.ok, envResult.err);
    assert.deepEqual(JSON.parse(envResult.out), { cwd: wslProject(workspace)!.linuxPath, token: 'spaces & $() quotes', home: await command('node', workspace, ['-p', 'process.env.HOME']) });
    const server = `const fs=require('node:fs'),http=require('node:http'),cp=require('node:child_process');
const child=cp.spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
fs.watch(process.cwd(),{recursive:true},(event,file)=>{if(file==='page.txt')fs.writeFileSync('observed.txt',fs.readFileSync('page.txt'));});
http.createServer((req,res)=>res.end(fs.readFileSync('page.txt'))).listen(0,'127.0.0.1',function(){console.log(JSON.stringify({port:this.address().port,child:child.pid,pid:process.pid}));});`;
    const child = startChild('node', ['-e', server], { cwd: workspace, env: {}, stdio: ['pipe', 'pipe', 'pipe'] });
    try {
      const ready = await new Promise<{ port: number; child: number; pid: number }>((resolve, reject) => {
        let output = '';
        let errors = '';
        child.stderr!.on('data', (chunk) => { errors += chunk; });
        child.stdout!.on('data', (chunk) => { output += chunk; if (output.includes('\n')) resolve(JSON.parse(output.split('\n')[0]!)); });
        child.once('error', reject);
        child.once('exit', (code) => reject(new Error(`server exited ${code}: ${errors}`)));
        setTimeout(() => reject(new Error(`server startup timed out: ${errors}`)), 15_000).unref();
      });
      await writeFile(join(workspace, 'page.txt'), 'edited');
      const deadline = Date.now() + 10_000;
      let observed = '';
      while (Date.now() < deadline && observed !== 'edited') {
        try { observed = await readFile(join(workspace, 'observed.txt'), 'utf8'); } catch {}
        await delay(50);
      }
      assert.equal(observed, 'edited');
      assert.equal(await command('node', workspace, ['-e', `fetch('http://127.0.0.1:${ready.port}').then(response=>response.text()).then(console.log)`]), 'edited');
      signalGroup(child, 'SIGKILL', 'signal-child');
      const stopped = await command('node', workspace, ['-e', `const fs=require('node:fs');const pids=${JSON.stringify([ready.pid, ready.child])};const end=Date.now()+5000;const check=()=>{if(pids.every(pid=>{try{return fs.readFileSync('/proc/'+pid+'/stat','utf8').split(') ')[1].startsWith('Z ')}catch{return true}}))process.exit(0);if(Date.now()>end)process.exit(1);setTimeout(check,50)};check()`]);
      assert.equal(stopped, '');
    } finally {
      signalGroup(child, 'SIGKILL', 'signal-child');
    }
  } finally {
    setCanonicalPathMapper(() => undefined);
    await rm(root, { recursive: true, force: true });
    if (flags === undefined) delete process.env['STUDIO_FLAGS'];
    else process.env['STUDIO_FLAGS'] = flags;
  }
});
