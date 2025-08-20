import { Sandbox } from "./sandbox";

export interface ClientOptions {
  sandboxId?: string;
  userId?: string;
}

export abstract class Client {
  constructor(public readonly options: ClientOptions) {}

  public abstract readonly sandbox: Sandbox<Client>;
}

export enum ClientErrorCode {
  Unimplemented = 501001,
  ImplementationError = 503001,
  SandboxNotFound = 404001,
  FileNotFound = 404002,
  MissingSandboxId = 400001,
  MissingTemplateId = 400002,
}

export const ClientErrorCodeToStatus = {
  [ClientErrorCode.Unimplemented]: 501,
  [ClientErrorCode.ImplementationError]: 503,
  [ClientErrorCode.SandboxNotFound]: 404,
  [ClientErrorCode.FileNotFound]: 404,
  [ClientErrorCode.MissingSandboxId]: 400,
  [ClientErrorCode.MissingTemplateId]: 400,
};

export class ClientError extends Error {
  constructor(
    public readonly code: ClientErrorCode,
    public readonly message: string,
    public readonly retriable: boolean
  ) {
    super(message);
  }

  get status() {
    return ClientErrorCodeToStatus[this.code];
  }

  toString() {
    return `${this.message} (code: ${this.code}, retriable: ${this.retriable})`;
  }
}
