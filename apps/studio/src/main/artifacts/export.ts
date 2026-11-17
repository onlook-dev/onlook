import { posix } from 'node:path';
import type { ArtifactFileBundle, ArtifactStore } from './adapter.js';
import { MAX_ARTIFACT_BYTES, validArtifactBundle } from './files.js';
import { artifactPrivacyIssues } from './privacy.js';
import { artifactReferences } from './references.js';
import { machineLocalFieldIn } from './manifest.js';

export type ArtifactExportRefusal = 'missing' | 'newer-reader' | 'files' | 'privacy' | 'references' | 'too-large';
export type ArtifactExport = { ok: true; html: string; title: string } | { ok: false; reason: ArtifactExportRefusal };
const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2' };

function portableReferences(bundle: ArtifactFileBundle): boolean {
  const files = new Set(bundle.files.map((file) => file.path));
  const cssDependencies = new Map<string, string[]>();
  for (const file of bundle.files) {
    if (!/\.(html|css|js)$/i.test(file.path)) continue;
    const text = Buffer.from(file.bytes).toString('utf8');
    let references;
    try { references = artifactReferences(text, posix.extname(file.path)); } catch { return false; }
    for (const reference of references) {
      const ref = reference.value;
      if (ref === '' || ref.startsWith('#')) continue;
      if (/^data:image\/(?:png|jpeg);base64,[a-z\d+/=]+$/i.test(ref)) continue;
      if (/[:\\%&\u0000-\u0020]|^\//u.test(ref)) return false;
      const target = posix.normalize(posix.join(posix.dirname(file.path), ref.split('#')[0] ?? ref));
      if (!files.has(target)) return false;
      if (file.path.endsWith('.css') && target.endsWith('.css')) cssDependencies.set(file.path, [...(cssDependencies.get(file.path) ?? []), target]);
    }
  }
  const complete = new Set<string>();
  const active = new Set<string>();
  const visit = (path: string): boolean => {
    if (active.has(path)) return false;
    if (complete.has(path)) return true;
    active.add(path);
    if ((cssDependencies.get(path) ?? []).some((dependency) => !visit(dependency))) return false;
    active.delete(path);
    complete.add(path);
    return true;
  };
  return [...cssDependencies.keys()].every(visit);
}

export async function exportArtifact(store: ArtifactStore, id: string, projectNames: string[] = []): Promise<ArtifactExport> {
  const read = await store.read(id);
  if (read.outcome !== 'resolved') return { ok: false, reason: 'missing' };
  const bundle = await store.readFiles(id, 'export');
  if (read.readOnly) return { ok: false, reason: 'newer-reader' };
  if ('code' in bundle || !validArtifactBundle(bundle)) return { ok: false, reason: 'files' };
  const titleBundle = { pages: [], files: [{ path: 'pages/title.html', bytes: Buffer.from(read.manifest.title) }] };
  const manifestBundle = { pages: [], files: [{ path: 'pages/manifest.html', bytes: Buffer.from(JSON.stringify(read.manifest)) }] };
  if (machineLocalFieldIn(read.manifest) !== undefined || [bundle, titleBundle, manifestBundle].some((content) => artifactPrivacyIssues(content, projectNames).length > 0)) return { ok: false, reason: 'privacy' };
  if (!portableReferences(bundle)) return { ok: false, reason: 'references' };
  const payload = JSON.stringify({ title: read.manifest.title, pages: bundle.pages, files: bundle.files.map((file) => ({ path: file.path, text: /\.(html|css|js)$/i.test(file.path) ? Buffer.from(file.bytes).toString('utf8') : null, data: MIME[posix.extname(file.path)] === undefined ? null : `data:${MIME[posix.extname(file.path)]};base64,${Buffer.from(file.bytes).toString('base64')}` })) }).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-src about:; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'"><title>Artifact</title><style>html,body{margin:0;height:100%;font:14px system-ui}iframe{border:0;width:100%;height:100%}</style></head><body><iframe title="Artifact page" sandbox="allow-scripts"></iframe><script type="application/json" id="artifact-data">${payload}</script><script>
const idea=JSON.parse(document.getElementById('artifact-data').textContent);
const files=new Map(idea.files.map(file=>[file.path,file]));
const frame=document.querySelector('iframe');
document.title=idea.title;
function resolve(from,ref){const pieces=from.split('/');pieces.pop();for(const part of ref.split('#')[0].split('/')){if(part==='..')pieces.pop();else if(part!=='.'&&part!=='')pieces.push(part);}return pieces.join('/');}
function css(text,path,seen=[]){if(seen.includes(path))throw new Error('Cyclic stylesheet');const flattened=text.replace(/@import\\s+(?:url\\(\\s*["']?([^"')\\s]+)["']?\\s*\\)|["']([^"']+)["'])\\s*([^;]*);/gi,(_match,url,quoted,media)=>{const resource=files.get(resolve(path,url??quoted));if(!resource||resource.text===null)throw new Error('Missing stylesheet');const content=css(resource.text,resource.path,[...seen,path]);return media.trim()?'@media '+media+'{'+content+'}':content;});return flattened.replace(/url\\(\\s*(?:"([^"]*)"|'([^']*)'|([^\\s)]+))\\s*\\)/gi,(match,double,single,bare)=>{const ref=double??single??bare;if(ref.startsWith('data:'))return match;const resource=files.get(resolve(path,ref));return resource?.data?'url("'+resource.data+'")':'url("")';});}
function show(destination){const path=destination.split('#')[0];const hash=destination.includes('#')?destination.slice(destination.indexOf('#')+1):'';const file=files.get(path);if(!file||file.text===null)return;const doc=new DOMParser().parseFromString(file.text,'text/html');
for(const script of doc.querySelectorAll('script[src]')){const resource=files.get(resolve(path,script.getAttribute('src')));script.removeAttribute('src');script.textContent=(resource?.text??'').replace(/<\\/script/gi,'<\\\\/script');}
for(const link of doc.querySelectorAll('link[href]')){const resource=files.get(resolve(path,link.getAttribute('href')));if(link.rel==='stylesheet'&&resource?.text!==null&&resource){const style=doc.createElement('style');style.textContent=css(resource.text,resource.path);link.replaceWith(style);}else if(resource?.data)link.href=resource.data;else link.remove();}
for(const image of doc.querySelectorAll('img[src]')){const ref=image.getAttribute('src');if(!ref.startsWith('data:'))image.src=files.get(resolve(path,ref))?.data??'';}
for(const image of doc.querySelectorAll('img[srcset]')){image.srcset=image.getAttribute('srcset').split(',').map(candidate=>{const parts=candidate.trim().split(/\\s+/);const resource=files.get(resolve(path,parts[0]));return (resource?.data??'')+(parts[1]?' '+parts[1]:'');}).join(', ');}
for(const style of doc.querySelectorAll('style'))style.textContent=css(style.textContent,path).replace(/<\\/style/gi,'<\\\\/style');
for(const element of doc.querySelectorAll('[style]'))element.setAttribute('style',css(element.getAttribute('style'),path));
for(const anchor of doc.querySelectorAll('a[href]')){const ref=anchor.getAttribute('href');if(ref.startsWith('#'))continue;const target=resolve(path,ref);anchor.setAttribute('href','#');anchor.setAttribute('data-artifact-page',target+(ref.includes('#')?ref.slice(ref.indexOf('#')):''));}
const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'";doc.head.prepend(policy);
const route=doc.createElement('script');route.textContent="document.addEventListener('click',event=>{const link=event.target.closest?.('[data-artifact-page]');if(link){event.preventDefault();parent.postMessage({artifactPage:link.dataset.artifactPage},'*');return;}const anchor=event.target.closest?.('a[href]');const ref=anchor?.getAttribute('href');if(ref?.startsWith('#')){event.preventDefault();const id=decodeURIComponent(ref.slice(1));(id?document.getElementById(id):document.body)?.scrollIntoView();}});";if(hash)route.textContent+="document.addEventListener('DOMContentLoaded',()=>document.getElementById("+JSON.stringify(hash).replaceAll('<',String.fromCharCode(92)+'u003c')+")?.scrollIntoView());";doc.body.append(route);frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;}
window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&typeof event.data?.artifactPage==='string'&&idea.pages.some(page=>page.path===event.data.artifactPage.split('#')[0]))show(event.data.artifactPage);});
show(idea.pages[0].path);
</script></body></html>`;
  if (Buffer.byteLength(html, 'utf8') > MAX_ARTIFACT_BYTES) return { ok: false, reason: 'too-large' };
  return { ok: true, html, title: read.manifest.title };
}
