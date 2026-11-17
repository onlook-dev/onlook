export const PICTURE_MAX_BYTES = 256 * 1024;

const PICTURE_TIMEOUT_MS = 5000;

// Raster only: an SVG would carry markup into a data: URL the renderer's CSP already trusts.
const PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const resolved = new Map<string, string>();

function rasterType(header: string | null): string | undefined {
  const type = header?.split(';')[0]?.trim().toLowerCase();
  return PICTURE_TYPES.find((candidate) => candidate === type);
}

/** Answers null on every failure: an avatar falls back to initials and nothing waits on the network. */
export async function resolvePicture(url: string): Promise<string | null> {
  const cached = resolved.get(url);
  if (cached !== undefined) return cached;
  try {
    if (new URL(url).protocol !== 'https:') return null;
  } catch {
    return null;
  }
  try {
    const response = await fetch(url, {
      // Following a redirect would leave https for any host, including this machine's own services.
      redirect: 'error',
      signal: AbortSignal.timeout(PICTURE_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const type = rasterType(response.headers.get('content-type'));
    if (type === undefined) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > PICTURE_MAX_BYTES) return null;
    const picture = `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
    resolved.set(url, picture);
    return picture;
  } catch {
    return null;
  }
}

export function resetPictureCache(): void {
  resolved.clear();
}
