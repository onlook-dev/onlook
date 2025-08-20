import { Client } from "../index";
import { SandboxFile } from "./file";

export interface SandboxCreateInput {
  // the sandbox ID is fed from the JWT token
  // id: string;
  // specify your own template ID to start up your sandbox faster
  templateId: string;
  // customize your sandbox metadata
  metadata: Record<string, string>;
}
export interface SandboxCreateOutput {
  externalId: string;
}

export interface SandboxGetInput {
  // the sandbox ID is fed from the JWT token
  // id: string;
}
export interface SandboxGetOutput {
  id: string;
  externalId: string;
}

export interface SandboxPauseInput {
  // the sandbox ID is fed from the JWT token
  // id: string;
}
export interface SandboxPauseOutput {}

export interface SandboxResumeInput {
  // the sandbox ID is fed from the JWT token
  // id: string;
}
export interface SandboxResumeOutput {}

export interface SandboxStopInput {
  // the sandbox ID is fed from the JWT token
  // id: string;
}
export interface SandboxStopOutput {}

export interface SandboxUrlInput {
  // the sandbox ID is fed from the JWT token
  // id: string;
}
export interface SandboxUrlOutput {
  url: string;
}

export abstract class Sandbox<T extends Client> {
  public abstract readonly file: SandboxFile<T>;

  constructor(protected readonly client: T) {}

  // called when the class is instantiated
  // use this to resume the sandbox, bump the timeout and/or connect to the sandbox
  abstract beforeSandboxCall(): Promise<void>;

  abstract create(input: SandboxCreateInput): Promise<SandboxCreateOutput>;
  abstract get(input: SandboxGetInput): Promise<SandboxGetOutput>;
  abstract pause(input: SandboxPauseInput): Promise<SandboxPauseOutput>;
  abstract resume(input: SandboxResumeInput): Promise<SandboxResumeOutput>;
  abstract stop(input: SandboxStopInput): Promise<SandboxStopOutput>;
  abstract url(input: SandboxUrlInput): Promise<SandboxUrlOutput>;
}
