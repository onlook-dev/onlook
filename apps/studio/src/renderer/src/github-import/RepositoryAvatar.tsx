import { useState } from 'react';

export function RepositoryAvatar({ fullName, dimmed = false }: { fullName: string; dimmed?: boolean }): React.JSX.Element {
  const owner = /^([a-z\d](?:[a-z\d-]*[a-z\d])?)\/[^/]+$/i.exec(fullName)?.[1];
  const source = owner === undefined ? undefined : `https://avatars.githubusercontent.com/${owner}?s=40`;
  const [loaded, setLoaded] = useState<string>();
  return <span aria-hidden="true" style={{ display: 'inline-flex', width: 20, height: 20, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', background: '#5a5a5a', opacity: dimmed ? 0.5 : 1 }}>
    {source !== undefined && <img src={source} alt="" width={20} height={20} referrerPolicy="no-referrer" decoding="async"
      onLoad={() => setLoaded(source)} onError={() => setLoaded(undefined)}
      style={{ display: 'block', width: 20, height: 20, objectFit: 'cover', opacity: loaded === source ? 1 : 0 }} />}
  </span>;
}
