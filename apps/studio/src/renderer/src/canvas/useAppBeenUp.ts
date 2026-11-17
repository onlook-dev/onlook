import { useEffect } from 'react';
import { noteAppUp, useAppBeenUpStore } from './toolbarRunControl.js';

export function useAppBeenUp(projectPath: string | null, hasLiveServer: boolean): boolean {
  useEffect(() => {
    if (projectPath !== null && hasLiveServer) noteAppUp(projectPath);
  }, [projectPath, hasLiveServer]);
  return useAppBeenUpStore((state) => projectPath !== null && state.up[projectPath] === true);
}
