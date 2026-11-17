import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCameraMotion } from '../cameraMotion.js';
import './frame.css';

export function FrameIdleThumbnail({ thumbnail }: { thumbnail: string | null }): React.JSX.Element | null {
  const [loaded, setLoaded] = useState<string | null>(null);
  const decoded = useRef<string | null>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const moving = useCameraMotion((state) => state.moving);
  useEffect(() => { if (!moving) setLoaded(decoded.current); }, [moving]);
  useLayoutEffect(() => {
    for (const animation of image.current?.getAnimations?.() ?? []) {
      if (moving) animation.pause();
      else animation.play();
    }
  }, [moving]);
  if (thumbnail === null) return null;
  // It takes pointer input: over a waking guest the live page is mounted and clickable under it, so a press
  // on what the user sees would land on a page they cannot see (ONL-2987).
  return (
    <img
      ref={image}
      src={thumbnail}
      alt=""
      className="frame-idle-thumbnail"
      data-testid="frame-idle-thumbnail"
      onLoad={() => {
        decoded.current = thumbnail;
        if (!useCameraMotion.getState().moving) setLoaded(thumbnail);
      }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left top', opacity: loaded === thumbnail ? 1 : 0 }}
    />
  );
}
