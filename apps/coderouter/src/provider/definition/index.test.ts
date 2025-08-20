import { describe, it, expect } from "bun:test";
import {
  ClientError,
  ClientErrorCode,
  ClientErrorCodeToStatus,
  Client,
} from "./index";
import {
  SandboxFile,
  SandboxFileListOutput,
  SandboxFileListInput,
  SandboxFileReadOutput,
  SandboxFileReadInput,
  SandboxFileRenameOutput,
  SandboxFileRenameInput,
  SandboxFileStatOutput,
  SandboxFileWriteOutput,
  SandboxFileWriteInput,
  SandboxFileStatInput,
  SandboxFileCopyInput,
  SandboxFileCopyOutput,
  SandboxFileDeleteInput,
  SandboxFileDeleteOutput,
  SandboxFileDownloadInput,
  SandboxFileDownloadOutput,
} from "./sandbox/file";
import {
  Sandbox,
  SandboxPauseInput,
  SandboxResumeOutput,
  SandboxResumeInput,
  SandboxStopOutput,
  SandboxStopInput,
  SandboxUrlInput,
  SandboxUrlOutput,
  SandboxPauseOutput,
  SandboxCreateInput,
  SandboxCreateOutput,
  SandboxGetInput,
  SandboxGetOutput,
} from "./sandbox";

class MockSandboxFile extends SandboxFile<MockClient> {
  constructor(protected readonly client: MockClient) {
    super(client);
  }

  copy(input: SandboxFileCopyInput): Promise<SandboxFileCopyOutput> {
    throw new Error("Method not implemented.");
  }

  delete(input: SandboxFileDeleteInput): Promise<SandboxFileDeleteOutput> {
    throw new Error("Method not implemented.");
  }

  download(
    input: SandboxFileDownloadInput
  ): Promise<SandboxFileDownloadOutput> {
    throw new Error("Method not implemented.");
  }

  list(input: SandboxFileListInput): Promise<SandboxFileListOutput> {
    throw new Error("Method not implemented.");
  }

  read(input: SandboxFileReadInput): Promise<SandboxFileReadOutput> {
    throw new Error("Method not implemented.");
  }

  rename(input: SandboxFileRenameInput): Promise<SandboxFileRenameOutput> {
    throw new Error("Method not implemented.");
  }

  stat(input: SandboxFileStatInput): Promise<SandboxFileStatOutput> {
    throw new Error("Method not implemented.");
  }

  write(input: SandboxFileWriteInput): Promise<SandboxFileWriteOutput> {
    throw new Error("Method not implemented.");
  }
}

class MockSandbox extends Sandbox<MockClient> {
  public readonly file: SandboxFile<MockClient>;

  constructor(protected readonly client: MockClient) {
    super(client);
    this.file = new MockSandboxFile(this.client);
  }

  create(input: SandboxCreateInput): Promise<SandboxCreateOutput> {
    throw new Error("Method not implemented.");
  }

  get(input: SandboxGetInput): Promise<SandboxGetOutput> {
    throw new Error("Method not implemented.");
  }

  pause(input: SandboxPauseInput): Promise<SandboxPauseOutput> {
    throw new Error("Method not implemented.");
  }

  resume(input: SandboxResumeInput): Promise<SandboxResumeOutput> {
    throw new Error("Method not implemented.");
  }

  stop(input: SandboxStopInput): Promise<SandboxStopOutput> {
    throw new Error("Method not implemented.");
  }

  url(input: SandboxUrlInput): Promise<SandboxUrlOutput> {
    throw new Error("Method not implemented.");
  }
}

// Mock class extending Client to test abstract class coverage
class MockClient extends Client {
  public readonly sandbox: MockSandbox;

  constructor() {
    super({});
    this.sandbox = new MockSandbox(this);
  }

  testMethod() {
    return "test";
  }
}

describe("Client", () => {
  it("should allow extending the abstract class", () => {
    const mockClient = new MockClient();
    expect(mockClient).toBeInstanceOf(Client);
    expect(mockClient).toBeInstanceOf(MockClient);
    expect(mockClient.testMethod()).toBe("test");
  });
});

describe("ClientErrorCode", () => {
  it("should have the correct error codes", () => {
    expect(ClientErrorCode.Unimplemented).toBe(501001);
    expect(ClientErrorCode.ImplementationError).toBe(503001);
    expect(ClientErrorCode.SandboxNotFound).toBe(404001);
    expect(ClientErrorCode.FileNotFound).toBe(404002);
  });

  it("should have bidirectional enum mapping", () => {
    // Test that the enum works both ways (number to string and string to number)
    expect(ClientErrorCode[501001]).toBe("Unimplemented");
    expect(ClientErrorCode[503001]).toBe("ImplementationError");
    expect(ClientErrorCode[404001]).toBe("SandboxNotFound");
    expect(ClientErrorCode[404002]).toBe("FileNotFound");

    // Test that the enum values are properly set
    expect(ClientErrorCode.Unimplemented).toBe(501001);
    expect(ClientErrorCode.ImplementationError).toBe(503001);
    expect(ClientErrorCode.SandboxNotFound).toBe(404001);
    expect(ClientErrorCode.FileNotFound).toBe(404002);
  });
});

describe("ClientErrorCodeToStatus", () => {
  it("should map error codes to correct HTTP status codes", () => {
    expect(ClientErrorCodeToStatus[ClientErrorCode.Unimplemented]).toBe(501);
    expect(ClientErrorCodeToStatus[ClientErrorCode.ImplementationError]).toBe(
      503
    );
    expect(ClientErrorCodeToStatus[ClientErrorCode.SandboxNotFound]).toBe(404);
    expect(ClientErrorCodeToStatus[ClientErrorCode.FileNotFound]).toBe(404);
  });

  it("should have all error codes mapped", () => {
    // Get only the numeric enum values (filter out string keys)
    const errorCodes = Object.values(ClientErrorCode).filter(
      (code): code is ClientErrorCode => typeof code === "number"
    );
    const mappedCodes = Object.keys(ClientErrorCodeToStatus).map(Number);

    expect(mappedCodes).toHaveLength(errorCodes.length);
    errorCodes.forEach((code) => {
      expect(ClientErrorCodeToStatus[code]).toBeDefined();
    });
  });
});

describe("ClientError", () => {
  it("should create a ClientError with correct properties", () => {
    const error = new ClientError(
      ClientErrorCode.FileNotFound,
      "File not found",
      false
    );

    expect(error.code).toBe(ClientErrorCode.FileNotFound);
    expect(error.message).toBe("File not found");
    expect(error.retriable).toBe(false);
    expect(error.name).toBe("Error");
    expect(error.status).toBe(404);
  });

  it("should extend Error class and call super constructor", () => {
    const error = new ClientError(
      ClientErrorCode.SandboxNotFound,
      "Sandbox not found",
      true
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ClientError);

    // Test that the Error constructor was called with the message
    expect(error.message).toBe("Sandbox not found");
    expect(error.name).toBe("Error");

    // Test that the error stack trace is properly set (indicates super() was called)
    expect(error.stack).toBeDefined();
  });

  it("should have correct status property", () => {
    const fileNotFoundError = new ClientError(
      ClientErrorCode.FileNotFound,
      "File not found",
      false
    );
    expect(fileNotFoundError.status).toBe(404);

    const unimplementedError = new ClientError(
      ClientErrorCode.Unimplemented,
      "Not implemented",
      false
    );
    expect(unimplementedError.status).toBe(501);

    const implementationError = new ClientError(
      ClientErrorCode.ImplementationError,
      "Implementation error",
      true
    );
    expect(implementationError.status).toBe(503);
  });

  it("should have correct toString representation", () => {
    const error = new ClientError(
      ClientErrorCode.ImplementationError,
      "Something went wrong",
      true
    );

    const expectedString =
      "Something went wrong (code: 503001, retriable: true)";
    expect(error.toString()).toBe(expectedString);
  });

  it("should handle different retriable values", () => {
    const retriableError = new ClientError(
      ClientErrorCode.SandboxNotFound,
      "Retry this",
      true
    );
    expect(retriableError.retriable).toBe(true);

    const nonRetriableError = new ClientError(
      ClientErrorCode.FileNotFound,
      "Don't retry this",
      false
    );
    expect(nonRetriableError.retriable).toBe(false);
  });

  it("should handle empty message", () => {
    const error = new ClientError(ClientErrorCode.Unimplemented, "", false);

    expect(error.message).toBe("");
    expect(error.toString()).toBe(" (code: 501001, retriable: false)");
  });

  it("should handle special characters in message", () => {
    const error = new ClientError(
      ClientErrorCode.ImplementationError,
      "Error with special chars: !@#$%^&*()",
      true
    );

    expect(error.message).toBe("Error with special chars: !@#$%^&*()");
    expect(error.toString()).toBe(
      "Error with special chars: !@#$%^&*() (code: 503001, retriable: true)"
    );
  });

  it("should handle all error code types in constructor", () => {
    // Test constructor with each error code to ensure full coverage
    const unimplementedError = new ClientError(
      ClientErrorCode.Unimplemented,
      "Not implemented",
      false
    );
    expect(unimplementedError.code).toBe(ClientErrorCode.Unimplemented);

    const implementationError = new ClientError(
      ClientErrorCode.ImplementationError,
      "Implementation error",
      true
    );
    expect(implementationError.code).toBe(ClientErrorCode.ImplementationError);

    const sandboxNotFoundError = new ClientError(
      ClientErrorCode.SandboxNotFound,
      "Sandbox not found",
      false
    );
    expect(sandboxNotFoundError.code).toBe(ClientErrorCode.SandboxNotFound);

    const fileNotFoundError = new ClientError(
      ClientErrorCode.FileNotFound,
      "File not found",
      true
    );
    expect(fileNotFoundError.code).toBe(ClientErrorCode.FileNotFound);
  });
});
