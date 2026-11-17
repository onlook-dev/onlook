import { useLayoutEffect } from 'react';

/** `visible`, not `auto`: any other overflow makes a scroll container and sticky stops working. */
export function useUnlockPageScroll(): void {
  useLayoutEffect(() => {
    const { documentElement: html, body } = document;
    const root = document.getElementById('root');
    const targets = [html, body, ...(root ? [root] : [])];
    const previous = targets.map((element) => element.style.cssText);
    targets.forEach((element) => {
      element.style.cssText += ';height:auto;overflow:visible;';
    });
    return () => {
      targets.forEach((element, index) => {
        element.style.cssText = previous[index] ?? '';
      });
    };
  }, []);
}
