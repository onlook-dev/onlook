import { join } from 'node:path';

export function browserSessionPath(userData: string, packaged: boolean): string {
  return packaged ? userData : join(userData, 'development-browser');
}
