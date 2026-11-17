import { expect, it } from 'bun:test';
import { createContext, runInContext } from 'node:vm';
import { Window } from 'happy-dom';
import { artifactTextDisposeScript, artifactTextPrepareScript, artifactTextValidateScript } from './text-guest.js';

function page() {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = '<section style="background-color: rgb(240, 245, 250)"><p style="padding: 20px; font-family: Inter; background-color: transparent">Hello</p></section>';
  const element = document.querySelector('p')!;
  document.elementFromPoint = () => element;
  const textBounds = {x: 30, y: 40, left: 30, top: 40, width: 70, height: 24, right: 100, bottom: 64, toJSON: () => ({})};
  let rects = [textBounds];
  const createRange = document.createRange.bind(document);
  document.createRange = () => Object.assign(createRange(), {getBoundingClientRect: () => textBounds, getClientRects: () => rects});
  const context = createContext({document, Node: window.Node, MutationObserver: window.MutationObserver, getComputedStyle: window.getComputedStyle.bind(window), innerWidth: 800, innerHeight: 600});
  const prepare = (point = {x: 40, y: 50}, token = 'target') => runInContext(artifactTextPrepareScript(point, token, Date.now() + 1000), context);
  const validate = (token = 'target') => runInContext(artifactTextValidateScript(token, Date.now() + 1000), context);
  return {window, document, element, textBounds, context, prepare, validate, rects: (value: typeof rects) => {rects = value;}};
}

it('anchors to text rather than element padding and inherits the nearest painted background', async () => {
  const test = page();
  try {
    expect(test.prepare()).toMatchObject({text: 'Hello', rect: {x: 30, y: 40, width: 70, height: 24}, style: {fontFamily: 'Inter', backgroundColor: 'rgb(240, 245, 250)'}});
    expect(test.validate()).toBe(true);
    test.document.querySelector('section')!.setAttribute('style', 'background-color: transparent');
    test.document.body.style.backgroundColor = 'transparent';
    test.document.documentElement.style.backgroundColor = 'transparent';
    expect(test.prepare()).toMatchObject({style: {backgroundColor: 'rgb(255, 255, 255)'}});
  } finally { await test.window.happyDOM.close(); }
});

it('ignores padding, pseudo-content hits and whitespace between wrapped text lines', async () => {
  const test = page();
  try {
    expect(test.prepare({x: 12, y: 22})).toBeNull();
    test.rects([{...test.textBounds, height: 10, bottom: 50}, {...test.textBounds, y: 60, top: 60, height: 10, bottom: 70}]);
    expect(test.prepare({x: 40, y: 55})).toBeNull();
    expect(test.prepare({x: 40, y: 65})).toMatchObject({text: 'Hello'});
  } finally { await test.window.happyDOM.close(); }
});

it('retains node identity and refuses an identical replacement at the same DOM path', async () => {
  const test = page();
  try {
    expect(test.prepare()).toMatchObject({text: 'Hello'});
    const replacement = test.element.cloneNode(true);
    test.element.replaceWith(replacement);
    expect(test.validate()).toBe(false);
    await test.window.happyDOM.waitUntilComplete();
    expect(test.validate()).toBe(false);
  } finally { await test.window.happyDOM.close(); }
});

it('invalidates detached and reattached nodes and same-value text replacements', async () => {
  for (const kind of ['element', 'text'] as const) {
    const test = page();
    try {
      test.prepare();
      if (kind === 'element') {
        const parent = test.element.parentElement!;
        test.element.remove();
        parent.append(test.element);
      } else test.element.textContent = 'Hello';
      await test.window.happyDOM.waitUntilComplete();
      expect(test.validate()).toBe(false);
    } finally { await test.window.happyDOM.close(); }
  }
});

it('bounds retained targets and rejects work after its execution deadline', async () => {
  const test = page();
  try {
    for (let index = 0; index < 40; index += 1) test.prepare({x: 40, y: 50}, `target-${index}`);
    expect(runInContext('globalThis.__studioArtifactTextTargets.size', test.context)).toBe(32);
    expect(test.validate('target-0')).toBe(false);
    expect(test.validate('target-39')).toBe(true);
    runInContext(artifactTextDisposeScript('target-39'), test.context);
    expect(test.validate('target-39')).toBe(false);
    expect(runInContext('globalThis.__studioArtifactTextTargets.size', test.context)).toBe(31);
    expect(runInContext(artifactTextPrepareScript({x: 40, y: 50}, 'late', Date.now() - 1000), test.context)).toBeNull();
    expect(runInContext(artifactTextValidateScript('target-39', Date.now() - 1000), test.context)).toBe(false);
  } finally { await test.window.happyDOM.close(); }
});
