export function observeArtifactControls(element: Element, activate: () => void): () => void {
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = (): void => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    clearTimeout(timer);
    frame = undefined;
    timer = undefined;
  };
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (!entry?.isIntersecting) { cancel(); return; }
    if (frame !== undefined || timer !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        frame = undefined;
        timer = setTimeout(() => { timer = undefined; activate(); }, 0);
      });
    });
  });
  observer.observe(element);
  return () => { observer.disconnect(); cancel(); };
}
