import { ARTIFACT_TEXT_MAX_LENGTH } from '@studio/events';

export const ARTIFACT_TEXT_WORLD = 998;

const helpers = `
  const pathOf = element => {
    const segments = [];
    let visited = 0;
    for (let current = element; current; current = current.parentElement) {
      if (segments.length >= 64) return null;
      let position = 1;
      for (let sibling = current.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
        if (++visited > 10000) return null;
        if (sibling.tagName === current.tagName) position += 1;
      }
      segments.unshift(current.tagName.toLowerCase() + ':nth-of-type(' + position + ')');
    }
    return segments.join('>');
  };
  const textOnly = element => element.isConnected && element.ownerDocument === document &&
    element.namespaceURI === 'http://www.w3.org/1999/xhtml' &&
    !element.closest('input,textarea,select,[contenteditable]') &&
    element.childNodes.length === 1 && element.firstChild.nodeType === Node.TEXT_NODE &&
    element.firstChild.data.length <= ${ARTIFACT_TEXT_MAX_LENGTH};
  const targets = globalThis.__studioArtifactTextTargets ??= new Map();
`;

export function artifactTextPrepareScript(point: { x: number; y: number }, token: string, deadline: number): string {
  return String.raw`(() => {
    if (Date.now() > ${deadline}) return null;
    ${helpers}
    const point = ${JSON.stringify(point)};
    if (point.x < 0 || point.y < 0 || point.x >= innerWidth || point.y >= innerHeight) return null;
    const element = document.elementFromPoint(point.x, point.y);
    if (!element || !textOnly(element)) return null;
    const domPath = pathOf(element);
    if (!domPath || domPath.length > 2048) return null;
    const text = element.firstChild.data;
    const range = document.createRange();
    range.selectNodeContents(element.firstChild);
    const rects = Array.from(range.getClientRects());
    if (rects.length > 1024 || !rects.some(rect => rect.width > 0 && rect.height > 0 && point.x >= rect.left && point.x < rect.right && point.y >= rect.top && point.y < rect.bottom)) return null;
    const bounds = range.getBoundingClientRect();
    const computed = getComputedStyle(element);
    const style = {};
    for (const key of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign','color','backgroundColor']) {
      const value = computed[key];
      if (typeof value !== 'string' || value.length > 512) return null;
      style[key] = value;
    }
    style.backgroundColor = 'rgb(255, 255, 255)';
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      const background = getComputedStyle(ancestor).backgroundColor;
      if (background !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(background)) {
        style.backgroundColor = background;
        break;
      }
    }
    while (targets.size >= 32) { const key = targets.keys().next().value; targets.get(key).observer.disconnect(); targets.delete(key); }
    const token = ${JSON.stringify(token)};
    const observer = new MutationObserver(records => {
      if (records.some(record => record.target === element || element.contains(record.target) ||
        Array.from(record.removedNodes).some(node => node === element || node.contains(element)))) {
        observer.disconnect(); targets.delete(token);
      }
    });
    observer.observe(document, {subtree:true,childList:true,characterData:true});
    targets.set(token, {element, child:element.firstChild, document, domPath, text, observer});
    return {domPath, text, rect:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}, style};
  })()`;
}

export function artifactTextValidateScript(token: string, deadline: number): string {
  return `(() => {
    if (Date.now() > ${deadline}) return false;
    ${helpers}
    const target = targets.get(${JSON.stringify(token)});
    if (!target || target.document !== document || !textOnly(target.element) ||
      target.element.firstChild !== target.child || target.child.data !== target.text || pathOf(target.element) !== target.domPath) return false;
    return true;
  })()`;
}

export function artifactTextDisposeScript(token: string): string {
  return `(() => {
    const targets = globalThis.__studioArtifactTextTargets;
    const token = ${JSON.stringify(token)};
    const target = targets?.get(token);
    if (target) { target.observer.disconnect(); targets.delete(token); }
  })()`;
}
