import { Client } from "../../index";

export interface SandboxFileCopyInput {}
export interface SandboxFileCopyOutput {}

export interface SandboxFileDeleteInput {
  path: string;
}
export interface SandboxFileDeleteOutput {}

export interface SandboxFileDownloadInput {}
export interface SandboxFileDownloadOutput {}

export interface SandboxFileListInput {
  path: string;
}
export interface SandboxFileListOutput {
  files: Array<{
    name: string;
    path: string;
    type: "file" | "directory";
  }>;
}

export interface SandboxFileReadInput {
  path: string;
}
export interface SandboxFileReadOutput {
  data: string;
}

export interface SandboxFileRenameInput {
  oldPath: string;
  newPath: string;
}
export interface SandboxFileRenameOutput {}

export interface SandboxFileStatInput {
  path: string;
}
export interface SandboxFileStatOutput {
  type: "file" | "directory";
}

export interface SandboxFileWriteInput {
  files: Array<{
    path: string;
    data: string;
    overwrite: boolean;
  }>;
}
export interface SandboxFileWriteOutput {}

export abstract class SandboxFile<T extends Client> {
  constructor(protected readonly client: T) {}

  abstract copy(input: SandboxFileCopyInput): Promise<SandboxFileCopyOutput>;
  abstract delete(
    input: SandboxFileDeleteInput
  ): Promise<SandboxFileDeleteOutput>;
  abstract download(
    input: SandboxFileDownloadInput
  ): Promise<SandboxFileDownloadOutput>;
  abstract list(input: SandboxFileListInput): Promise<SandboxFileListOutput>;
  abstract read(input: SandboxFileReadInput): Promise<SandboxFileReadOutput>;
  abstract rename(
    input: SandboxFileRenameInput
  ): Promise<SandboxFileRenameOutput>;
  abstract stat(input: SandboxFileStatInput): Promise<SandboxFileStatOutput>;
  abstract write(input: SandboxFileWriteInput): Promise<SandboxFileWriteOutput>;
}
