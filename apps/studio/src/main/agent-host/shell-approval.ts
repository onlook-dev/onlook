import { hostPlatform, isWindows } from '../env/platform.js';
export function requiresShellApproval(tool: string, platform: NodeJS.Platform = hostPlatform()): boolean {
  return tool.toLowerCase() === 'powershell' || (isWindows(platform) && tool === 'Bash');
}
