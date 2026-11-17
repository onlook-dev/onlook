import { useLayoutEffect, useRef } from 'react';
import { UpdateRequiredScreen } from '../../cloud/UpdateRequired.js';
import { noop, type Gallery } from './Showroom.js';

function Still({ state }: { state: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (state === 'focus') root.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [state]);
  return <div ref={root} data-cloud-update-still={state} style={{ width: state === 'narrow' ? 360 : 960, height: 580 }}>
    <style href="cloud-update-hover" precedence="medium">{'[data-cloud-update-still="hover"] button { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); } [data-cloud-update-still="focus"] button { outline: 2px solid var(--color-accent); outline-offset: var(--button-focus-offset); }'}</style>
    <UpdateRequiredScreen onUpdate={noop} />
  </div>;
}

export const CLOUD_UPDATE_GALLERY: Gallery = {
  id: 'cloud-update', title: 'Update required',
  categories: [{ id: 'states', title: 'Unsupported build', stories: ['default', 'hover', 'focus', 'narrow'].map((state) => ({
    id: `cloud-update-${state}`, title: state, wide: true, render: () => <Still state={state} />,
  })) }],
};
