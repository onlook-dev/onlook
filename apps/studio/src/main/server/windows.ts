import { join } from 'node:path';
import { systemExecutable } from '../env/platform.js';
import { APP_ENV, runChild } from '../env/child.js';

const INSPECT = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class StudioProcessDirectory {
  [StructLayout(LayoutKind.Sequential)] struct BasicInfo {
    public IntPtr Reserved1, Peb, Reserved2a, Reserved2b, ProcessId, Reserved3;
  }
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetProcessTimes(IntPtr handle, out ulong created, out ulong exited, out ulong kernel, out ulong user);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool ReadProcessMemory(IntPtr handle, IntPtr address, byte[] buffer, int size, out IntPtr read);
  [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr handle, int kind, out BasicInfo info, int size, out int read);
  [DllImport("ntdll.dll", EntryPoint="NtQueryInformationProcess")] static extern int QueryWow64(IntPtr handle, int kind, out IntPtr info, int size, out int read);
  static byte[] Read(IntPtr handle, long address, int size) {
    var buffer = new byte[size]; IntPtr read;
    if (!ReadProcessMemory(handle, new IntPtr(address), buffer, size, out read) || read.ToInt64() != size) throw new InvalidOperationException();
    return buffer;
  }
  public static string[] ReadIdentity(int pid) {
    var handle = OpenProcess(0x410, false, pid);
    if (handle == IntPtr.Zero) return null;
    try {
      ulong created, exited, kernel, user;
      if (!GetProcessTimes(handle, out created, out exited, out kernel, out user) || created == 0) return null;
      BasicInfo info; int returned;
      if (NtQueryInformationProcess(handle, 0, out info, Marshal.SizeOf(typeof(BasicInfo)), out returned) != 0) return null;
      IntPtr wow;
      if (QueryWow64(handle, 26, out wow, IntPtr.Size, out returned) != 0) return null;
      bool narrow = wow != IntPtr.Zero;
      long peb = narrow ? wow.ToInt64() : info.Peb.ToInt64();
      var pointer = Read(handle, peb + (narrow ? 0x10 : 0x20), narrow ? 4 : 8);
      long parameters = narrow ? BitConverter.ToUInt32(pointer, 0) : BitConverter.ToInt64(pointer, 0);
      var directory = Read(handle, parameters + (narrow ? 0x24 : 0x38), narrow ? 8 : 16);
      int length = BitConverter.ToUInt16(directory, 0);
      if (length == 0 || length % 2 != 0 || length > 65532) return null;
      long address = narrow ? BitConverter.ToUInt32(directory, 4) : BitConverter.ToInt64(directory, 8);
      return new[] { System.Text.Encoding.Unicode.GetString(Read(handle, address, length)), created.ToString(System.Globalization.CultureInfo.InvariantCulture) };
    } catch { return null; }
    finally { CloseHandle(handle); }
  }
}
'@
$listeners = if ($StudioPort -gt 0) { @(Get-NetTCPConnection -LocalPort $StudioPort -State Listen -ErrorAction SilentlyContinue) } else { @() }
$candidates = if ($StudioPid -gt 0) { @(Get-Process -Id $StudioPid -ErrorAction SilentlyContinue) } elseif ($StudioPort -gt 0) { @($listeners | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }) } else { @(Get-Process) }
$result = @($candidates | ForEach-Object {
  $processIdentity = [StudioProcessDirectory]::ReadIdentity($_.Id)
  if ($processIdentity) {
    $identity = $_
    $ports = @($listeners | Where-Object { $_.OwningProcess -eq $identity.Id } | Select-Object -ExpandProperty LocalPort -Unique)
    [pscustomobject]@{ pid = $identity.Id; cwd = $processIdentity[0]; creationTime = $processIdentity[1]; command = $identity.ProcessName; ports = $ports }
  }
})
ConvertTo-Json -InputObject $result -Depth 3 -Compress
`;

export interface WindowsProcess {
  pid: number;
  cwd: string;
  creationTime?: string;
  command: string;
  ports: number[];
}

export function parseWindowsProcesses(text: string): WindowsProcess[] {
  const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (!Array.isArray(parsed)) throw new Error('Invalid Windows process inspection response');
  return parsed.filter((value): value is WindowsProcess => {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<WindowsProcess>;
    return Number.isSafeInteger(candidate.pid) && candidate.pid! > 1 && typeof candidate.cwd === 'string'
      && /^(?:[A-Za-z]:\\|\\\\)/.test(candidate.cwd) && typeof candidate.command === 'string'
      && (candidate.creationTime === undefined || (typeof candidate.creationTime === 'string' && /^[1-9]\d{0,19}$/.test(candidate.creationTime)))
      && Array.isArray(candidate.ports) && candidate.ports.every((port) => Number.isInteger(port) && port > 0 && port <= 65535);
  });
}

export interface WindowsInspectionOptions {
  timeoutMs?: number;
}

export function windowsProcesses(port?: number, options?: WindowsInspectionOptions): Promise<WindowsProcess[]> {
  return inspectWindowsProcesses(port, undefined, options);
}

export async function inspectWindowsProcess(pid: number, options?: WindowsInspectionOptions): Promise<WindowsProcess | undefined> {
  if (!Number.isSafeInteger(pid) || pid <= 1) throw new Error('Invalid process identity');
  const candidates = await inspectWindowsProcesses(undefined, pid, options);
  return candidates.length === 1 && candidates[0]?.pid === pid ? candidates[0] : undefined;
}

function inspectWindowsProcesses(port?: number, pid?: number, options?: WindowsInspectionOptions): Promise<WindowsProcess[]> {
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) return Promise.reject(new Error('Invalid listener port'));
  const timeoutMs = options?.timeoutMs ?? 10_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) return Promise.reject(new Error('Invalid inspection timeout'));
  return new Promise((resolve, reject) => {
    runChild(join(systemExecutable('WindowsPowerShell'), 'v1.0', 'powershell.exe'), [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(`$StudioPort = ${port ?? 0}\n$StudioPid = ${pid ?? 0}\n${INSPECT}`, 'utf16le').toString('base64'),
    ], { env: APP_ENV, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8', windowsHide: true }, (error, stdout) => {
      if (error) {
        reject(error.killed && error.signal === 'SIGTERM'
          ? new Error(`PowerShell inspection timed out after ${timeoutMs}ms`, { cause: error })
          : error);
        return;
      }
      try { resolve(parseWindowsProcesses(stdout)); } catch (cause) { reject(cause); }
    });
  });
}
