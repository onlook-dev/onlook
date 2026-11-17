import { executableCommand } from './windows.js';
import { systemExecutable } from './platform.js';

const JOB_RUNNER = String.raw`
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class StudioCliJob {
  [StructLayout(LayoutKind.Sequential)] struct Limits {
    public long processTime, jobTime; public uint flags; public UIntPtr minWorking, maxWorking;
    public uint active; public UIntPtr affinity; public uint priority, scheduling;
  }
  [StructLayout(LayoutKind.Sequential)] struct Counters { public ulong readOperations,writeOperations,otherOperations,readBytes,writeBytes,otherBytes; }
  [StructLayout(LayoutKind.Sequential)] struct Extended {
    public Limits basic; public Counters io; public UIntPtr processMemory, jobMemory, peakProcess, peakJob;
  }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct Startup {
    public uint size; public string reserved, desktop, title;
    public uint positionX,positionY,width,height,charsX,charsY,fill,flags; public ushort show,reservedSize;
    public IntPtr reservedPointer,input,output,error;
  }
  [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr process,thread; public uint pid,tid; }
  [StructLayout(LayoutKind.Sequential)] struct ExtendedStartup { public Startup startup; public IntPtr attributes; }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr security, string name);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int kind, ref Extended info, uint size);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, uint flags, ref IntPtr size);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute, IntPtr value, IntPtr size, IntPtr previous, IntPtr returned);
  [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app, StringBuilder command, IntPtr processSecurity, IntPtr threadSecurity, bool inherit, uint flags, IntPtr env, string cwd, ref ExtendedStartup startup, out ProcessInfo info);
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int kind);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
  [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process, uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  static void Check(bool value) { if (!value) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  public static int Run(string command) {
    IntPtr job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
    ProcessInfo child = new ProcessInfo();
    IntPtr attributes = IntPtr.Zero, jobValue = IntPtr.Zero;
    bool initialized = false;
    try {
      Extended limits = new Extended(); limits.basic.flags = 0x2000;
      Check(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(Extended))));
      IntPtr bytes = IntPtr.Zero;
      InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref bytes);
      attributes = Marshal.AllocHGlobal(bytes);
      Check(InitializeProcThreadAttributeList(attributes, 1, 0, ref bytes)); initialized = true;
      jobValue = Marshal.AllocHGlobal(IntPtr.Size); Marshal.WriteIntPtr(jobValue, job);
      Check(UpdateProcThreadAttribute(attributes, 0, new IntPtr(0x0002000D), jobValue, new IntPtr(IntPtr.Size), IntPtr.Zero, IntPtr.Zero));
      ExtendedStartup startup = new ExtendedStartup(); startup.attributes = attributes;
      startup.startup.size = (uint)Marshal.SizeOf(typeof(ExtendedStartup)); startup.startup.flags = 0x100;
      startup.startup.input = GetStdHandle(-10); startup.startup.output = GetStdHandle(-11); startup.startup.error = GetStdHandle(-12);
      Check(SetHandleInformation(startup.startup.input, 1, 1)); Check(SetHandleInformation(startup.startup.output, 1, 1)); Check(SetHandleInformation(startup.startup.error, 1, 1));
      Check(CreateProcess(null, new StringBuilder(command), IntPtr.Zero, IntPtr.Zero, true, 0x00080000 | 0x08000000, IntPtr.Zero, null, ref startup, out child));
      if (WaitForSingleObject(child.process, uint.MaxValue) != 0) throw new Win32Exception(Marshal.GetLastWin32Error());
      uint code; Check(GetExitCodeProcess(child.process, out code)); return unchecked((int)code);
    } finally {
      if (child.process != IntPtr.Zero) { TerminateProcess(child.process, 1); CloseHandle(child.thread); CloseHandle(child.process); }
      CloseHandle(job);
      if (initialized) DeleteProcThreadAttributeList(attributes);
      if (attributes != IntPtr.Zero) Marshal.FreeHGlobal(attributes);
      if (jobValue != IntPtr.Zero) Marshal.FreeHGlobal(jobValue);
    }
  }
}
`;

function quoted(value: string): string {
  return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1')}"`;
}

export function windowsJobCommand(bin: string, args: string[]): { bin: string; args: string[]; windowsVerbatimArguments?: boolean } {
  const command = executableCommand(bin, args, 'win32');
  const line = command.windowsVerbatimArguments
    ? `${quoted(command.bin)} ${command.args.join(' ')}`
    : [command.bin, ...command.args].map(quoted).join(' ');
  const encodedLine = Buffer.from(line, 'utf8').toString('base64');
  const script = `$ErrorActionPreference='Stop'; Add-Type -TypeDefinition @'\n${JOB_RUNNER}\n'@; try { exit [StudioCliJob]::Run([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedLine}'))) } catch { $cause=$_.Exception.GetBaseException(); if ($cause -is [ComponentModel.Win32Exception] -and $cause.NativeErrorCode -in 2,3) { [Console]::Error.WriteLine('ONLOOK_CLI_EXECUTABLE_MISSING') } else { [Console]::Error.WriteLine($cause.ToString()) }; exit 127 }`;
  return { bin: systemExecutable('WindowsPowerShell/v1.0/powershell.exe'), args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')] };
}
