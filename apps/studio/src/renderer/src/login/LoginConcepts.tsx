
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { shotTransform } from '../tour/camera.js';
import { SCENE_HREF, SCENE_RULES, TourScene } from '../tour/TourScene.js';

const TOUR_SHOT = { x: -120, y: -260, width: 1180 };
const HOVER = 22;

function mirrorTourWindow(root: HTMLElement | null): (() => void) | undefined {
  const scene = root?.querySelector<HTMLElement>('.ts');
  const win = scene?.querySelector<HTMLElement>('.win');
  if (!scene || !win) return undefined;
  scene.querySelector<HTMLElement>('canvas.refl')?.style.setProperty('display', 'none');
  // One sharp mirror image. On a glossy floor the reflection is strongest at the contact line and falls off fast.
  const mirror = win.cloneNode(true) as HTMLElement;
  Object.assign(mirror.style, {
    transformOrigin: '50% 100%',
    transform: 'scaleY(-1)',
    translate: `0 ${HOVER}px`,
    animation: 'none',
    border: '0',
    boxShadow: 'none',
    maskImage:
      'linear-gradient(to top, rgb(0 0 0 / .5) 0, rgb(0 0 0 / .32) 6%, rgb(0 0 0 / .16) 14%, rgb(0 0 0 / .06) 24%, transparent 36%)',
    pointerEvents: 'none',
  });
  const mirrors = [mirror];
  if (scene.hasAttribute('data-intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    mirror.animate(
      [
        { opacity: 0, transform: 'scaleY(-1) translateY(14px)' },
        { opacity: 1, transform: 'scaleY(-1)' },
      ],
      { duration: 800, easing: 'cubic-bezier(.2,0,0,1)', fill: 'backwards' },
    );
  }
  win.after(mirror);
  win.style.translate = `0 -${HOVER}px`;
  const contact = scene.querySelector<HTMLElement>('.contact');
  if (contact) Object.assign(contact.style, { opacity: '0.45', filter: 'blur(18px)' });
  const copyCanvases = (): void => {
    const from = win.querySelectorAll('canvas');
    for (const mirror of mirrors) {
      const to = mirror.querySelectorAll('canvas');
      from.forEach((source, index) => {
        const target = to[index];
        if (!target || source.width === 0) return;
        target.width = source.width;
        target.height = source.height;
        target.getContext('2d')?.drawImage(source, 0, 0);
      });
    }
  };
  copyCanvases();
  // The tour paints its art a frame or two after mount; catch each pass.
  const timer = window.setInterval(copyCanvases, 300);
  const stop = window.setTimeout(() => window.clearInterval(timer), 4000);
  return () => {
    window.clearInterval(timer);
    window.clearTimeout(stop);
    mirror.remove();
    win.style.translate = '';
    contact?.style.removeProperty('opacity');
    contact?.style.removeProperty('filter');
  };
}

const MIST_RULES = `
.login-tour-shot .ts .cvi{translate:0 -70px}
.login-tour-shot .ts canvas.bdp{filter:blur(3px)}
.login-tour-shot .ts canvas.mist{position:absolute;left:0;top:0;width:100%;height:1300px;pointer-events:none;border-radius:0;background:none;-webkit-mask-image:linear-gradient(180deg,transparent 0,black 25%,black 78%,transparent 100%);mask-image:linear-gradient(180deg,transparent 0,black 25%,black 78%,transparent 100%)}
`;

const MIST_FS = `precision mediump float;
uniform vec2 res;uniform float time;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/res.y;
  float t=time*.036;
  vec2 q=vec2(fbm(uv*1.4+vec2(t,-t*.4)),fbm(uv*1.4+vec2(5.2-t*.6,1.3+t*.3)));
  vec2 r=vec2(fbm(uv*1.8+q*2.2+vec2(1.7+t*.9,9.2)),fbm(uv*1.8+q*2.2+vec2(8.3,2.8-t*.7)));
  float m=fbm(uv*1.6+r*1.8+vec2(t*.5,0.));
  float m2=fbm(uv*2.3-r*1.4+vec2(-t*.35,t*.2)+7.3);
  float body=smoothstep(.42,.95,m);
  float edge=smoothstep(.5,.9,m2)*(1.-body*.6);
  float core=smoothstep(.72,1.,m)*.8;
  float shade=smoothstep(.55,.15,m2)*.5;
  vec3 c=vec3(.0)*shade+vec3(.34)*body*.6+vec3(.58)*edge*.35+vec3(.82)*core*.3;
  float a=clamp(shade+body*.6+edge*.35+core*.3,0.,1.)*.55;
  gl_FragColor=vec4(c*.55,a);
}`;

function addMist(root: HTMLElement | null): (() => void) | undefined {
  const backdrop = root?.querySelector<HTMLElement>('.ts .bgx');
  if (!backdrop) return undefined;
  const cv = document.createElement('canvas');
  cv.className = 'mist';
  cv.width = 464;
  cv.height = 260;
  backdrop.append(cv);
  const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return () => cv.remove();
  const compile = (type: number, src: string): WebGLShader => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, MIST_FS));
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(program, 'res'), cv.width, cv.height);
  const timeAt = gl.getUniformLocation(program, 'time');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now();
  let frame = 0;
  const draw = (): void => {
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform1f(timeAt, 40 + (performance.now() - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still) frame = requestAnimationFrame(draw);
  };
  draw();
  return () => {
    cancelAnimationFrame(frame);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cv.remove();
  };
}

const FLOOR_Y = 940;
const FLOOR_BLUR = [2, 4, 7, 11, 16, 24, 32];

/**
 * A progressive blur over the floor, sized to exactly the visible half. A backdrop blur samples past its own
 * edges, so one that reached beyond the half pulled the dark left half and the frame's edge into a vignette.
 */
function FloorBlur({ top }: { top: number }): React.JSX.Element {
  const band = 100 / (FLOOR_BLUR.length + 2);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, bottom: 0, pointerEvents: 'none' }}>
      {FLOOR_BLUR.map((radius, index) => {
        const [a, b, c, d] = [index, index + 1, index + 2, index + 3].map((step) => `${(step * band).toFixed(1)}%`);
        const last = index === FLOOR_BLUR.length - 1;
        const mask =
          index === 0
            ? `linear-gradient(to bottom, black 0, black ${c}, transparent ${d})`
            : last
              ? `linear-gradient(to bottom, transparent ${a}, black ${b})`
              : `linear-gradient(to bottom, transparent ${a}, black ${b}, black ${c}, transparent ${d})`;
        return (
          <div
            key={radius}
            style={{
              position: 'absolute',
              inset: 0,
              backdropFilter: `blur(${radius}px)`,
              WebkitBackdropFilter: `blur(${radius}px)`,
              maskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}

export function TourSceneShot(): React.JSX.Element {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  useLayoutEffect(() => {
    const el = frame.current;
    if (el === null) return;
    setWidth(el.offsetWidth);
    setHeight(el.offsetHeight);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry?.contentRect.width ?? 0);
      setHeight(entry?.contentRect.height ?? 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // The tour shows a CSS stand-in while its real backdrop paints off-thread, then fades the darker real one in.
  // Hold the scene back until the real one is ready, so it arrives once, at its final tone.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (width === 0 || ready) return;
    const backdrop = frame.current?.querySelector<HTMLCanvasElement>('.ts canvas.bdp');
    if (!backdrop) return;
    const check = (): void => {
      if (!backdrop.hasAttribute('data-ready')) return;
      const scene = backdrop.closest<HTMLElement>('.ts');
      scene?.removeAttribute('data-intro');
      void scene?.offsetWidth;
      scene?.setAttribute('data-intro', '');
      setReady(true);
    };
    const observer = new MutationObserver(check);
    observer.observe(backdrop, { attributes: true, attributeFilter: ['data-ready'] });
    check();
    return () => observer.disconnect();
  }, [width, ready]);
  // The shot is framed by width alone; this keeps the editor window at the panel's vertical centre as the height changes.
  const appliedOffset = useRef(0);
  useLayoutEffect(() => {
    const root = frame.current;
    const win = root?.querySelector<HTMLElement>('.ts .win');
    if (!root || !win || width === 0) return;
    const box = win.getBoundingClientRect();
    const panel = root.getBoundingClientRect();
    // Measured against the offset already painted, so one pass lands it and no pass feeds the next.
    const next = Math.round(appliedOffset.current + panel.top + height / 2 - (box.top + box.height / 2));
    if (next === appliedOffset.current) return;
    appliedOffset.current = next;
    setOffsetY(next);
  }, [width, height, ready]);
  const hasWidth = width > 0;
  useEffect(() => {
    if (!hasWidth || !ready) return;
    const unmirror = mirrorTourWindow(frame.current);
    const unmist = addMist(frame.current);
    return () => {
      unmirror?.();
      unmist?.();
    };
    // Built once: both sit inside the scaled scene, so a width change moves them without a rebuild.
  }, [hasWidth, ready]);
  return (
    <div ref={frame} className="login-tour-shot" style={{ position: 'absolute', inset: 0, background: 'color(display-p3 0.0392 0.0392 0.0464)' }}>
      <style href={SCENE_HREF} precedence="medium">
        {SCENE_RULES}
      </style>
      <style href="login-tour-mist-shader" precedence="medium">
        {MIST_RULES}
      </style>
      {width > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: offsetY,
            transformOrigin: '0 0',
            transform: shotTransform(TOUR_SHOT, width),
            opacity: ready ? 1 : 0,
            transition: 'opacity .5s ease-out',
          }}
        >
          <TourScene step="canvas" />
        </div>
      ) : null}
      {width > 0 && ready ? <FloorBlur top={offsetY + ((FLOOR_Y - TOUR_SHOT.y) * width) / TOUR_SHOT.width} /> : null}
    </div>
  );
}
