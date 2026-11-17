export interface PickedFolder {
  path: string;
  name: string;
}

export interface PickFolderRequest {
  title: string;
  buttonLabel: string;
  creationSource?: 'folder';
}

export interface PickFolderResult {
  canceled: boolean;
  /** Present iff `canceled` is false. */
  folder?: PickedFolder;
}

export interface FrameIdleRequest {
  webContentsId: number;
  idle: boolean;
  moving?: boolean;
}

export interface FrameIdleResult {
  paused: boolean;
  thumbnail?: string;
}

/** Plumbing a Frame's webview mounts on before main hands it the page, never an address a Frame shows (ONL-2987). */
export const FRAME_ATTACH_PREFIX = 'about:blank#studio-frame-attach=';
export const FRAME_BIRTH_PREFIX = 'about:blank#studio-frame-born=';

export function isFrameMountUrl(url: string): boolean {
  return url.startsWith(FRAME_ATTACH_PREFIX) || url.startsWith(FRAME_BIRTH_PREFIX);
}

export interface FramePictureRequest {
  webContentsId: number;
  afterPaint?: boolean;
  retake?: boolean;
}

export type FramePictureResult = string | true | null;

export interface ArtifactSnapshotRequest {
  webContentsId: number;
  url: string;
}

export interface ArtifactSnapshot {
  image: string;
  width: number;
  height: number;
}
