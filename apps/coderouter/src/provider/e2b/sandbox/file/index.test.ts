import { describe, expect, it, beforeEach, jest } from "bun:test";
import { E2BClient } from "@/provider/e2b/index";
import { E2BSandboxFile } from "./index";
import {
  ClientError,
  ClientErrorCode,
  ClientOptions,
} from "@/provider/definition";

// Create a mock sandbox object that matches the expected interface
const createMockSandbox = () =>
  ({
    files: {
      exists: jest.fn(),
      read: jest.fn(),
      write: jest.fn(),
      remove: jest.fn(),
      rename: jest.fn(),
      list: jest.fn(),
      getInfo: jest.fn(),
    },
    create: jest.fn(),
    kill: jest.fn(),
    // Add other required properties to satisfy the Sandbox interface
    runCode: jest.fn(),
    createCodeContext: jest.fn(),
    jupyterUrl: "http://localhost:8888",
    commands: jest.fn(),
    sandboxId: "test-sandbox-id",
    process: { pid: 123 },
    close: jest.fn(),
    restart: jest.fn(),
    getLogs: jest.fn(),
    getProcessLogs: jest.fn(),
    getStdout: jest.fn(),
    getStderr: jest.fn(),
    getExitCode: jest.fn(),
    getStatus: jest.fn(),
    getMetadata: jest.fn(),
    updateMetadata: jest.fn(),
    getEnvironmentVariables: jest.fn(),
    updateEnvironmentVariables: jest.fn(),
    getPorts: jest.fn(),
    getOpenPorts: jest.fn(),
    getOpenPort: jest.fn(),
    getPort: jest.fn(),
    openPort: jest.fn(),
    closePort: jest.fn(),
    getHostname: jest.fn(),
    getUrl: jest.fn(),
    getLocalUrl: jest.fn(),
    getPublicUrl: jest.fn(),
    getLocalPort: jest.fn(),
    getPublicPort: jest.fn(),
    getLocalHostname: jest.fn(),
    getPublicHostname: jest.fn(),
    getLocalProtocol: jest.fn(),
    getPublicProtocol: jest.fn(),
    getLocalScheme: jest.fn(),
    getPublicScheme: jest.fn(),
    getLocalAuthority: jest.fn(),
    getPublicAuthority: jest.fn(),
    getLocalPath: jest.fn(),
    getPublicPath: jest.fn(),
    getLocalQuery: jest.fn(),
    getPublicQuery: jest.fn(),
    getLocalFragment: jest.fn(),
    getPublicFragment: jest.fn(),
    getLocalUserInfo: jest.fn(),
    getPublicUserInfo: jest.fn(),
    getLocalUsername: jest.fn(),
    getPublicUsername: jest.fn(),
    getLocalPassword: jest.fn(),
    getPublicPassword: jest.fn(),
    getLocalHost: jest.fn(),
    getPublicHost: jest.fn(),
    getLocalPortNumber: jest.fn(),
    getPublicPortNumber: jest.fn(),
    getLocalHostnameString: jest.fn(),
    getPublicHostnameString: jest.fn(),
    getLocalProtocolString: jest.fn(),
    getPublicProtocolString: jest.fn(),
    getLocalSchemeString: jest.fn(),
    getPublicSchemeString: jest.fn(),
    getLocalAuthorityString: jest.fn(),
    getPublicAuthorityString: jest.fn(),
    getLocalPathString: jest.fn(),
    getPublicPathString: jest.fn(),
    getLocalQueryString: jest.fn(),
    getPublicQueryString: jest.fn(),
    getLocalFragmentString: jest.fn(),
    getPublicFragmentString: jest.fn(),
    getLocalUserInfoString: jest.fn(),
    getPublicUserInfoString: jest.fn(),
    getLocalUsernameString: jest.fn(),
    getPublicUsernameString: jest.fn(),
    getLocalPasswordString: jest.fn(),
    getPublicPasswordString: jest.fn(),
    getLocalHostString: jest.fn(),
    getPublicHostString: jest.fn(),
    getLocalPortNumberString: jest.fn(),
    getPublicPortNumberString: jest.fn(),
    getLocalHostnameNumber: jest.fn(),
    getPublicHostnameNumber: jest.fn(),
    getLocalProtocolNumber: jest.fn(),
    getPublicProtocolNumber: jest.fn(),
    getLocalSchemeNumber: jest.fn(),
    getPublicSchemeNumber: jest.fn(),
    getLocalAuthorityNumber: jest.fn(),
    getPublicAuthorityNumber: jest.fn(),
    getLocalPathNumber: jest.fn(),
    getPublicPathNumber: jest.fn(),
    getLocalQueryNumber: jest.fn(),
    getPublicQueryNumber: jest.fn(),
    getLocalFragmentNumber: jest.fn(),
    getPublicFragmentNumber: jest.fn(),
    getLocalUserInfoNumber: jest.fn(),
    getPublicUserInfoNumber: jest.fn(),
    getLocalUsernameNumber: jest.fn(),
    getPublicUsernameNumber: jest.fn(),
    getLocalPasswordNumber: jest.fn(),
    getPublicPasswordNumber: jest.fn(),
    getLocalHostNumber: jest.fn(),
    getPublicHostNumber: jest.fn(),
    getLocalPortNumberNumber: jest.fn(),
    getPublicPortNumberNumber: jest.fn(),
  } as any);

class E2BMockClient extends E2BClient {
  private _mockSandbox = createMockSandbox();

  constructor(options: ClientOptions) {
    super(options, "test-api-key");
  }

  _sandbox = this._mockSandbox;

  // Method to set sandbox to null for testing error cases
  setSandboxNull() {
    this._mockSandbox = null as any;
    this._sandbox = null as any;
  }

  // Method to restore sandbox for testing
  restoreSandbox() {
    this._mockSandbox = createMockSandbox();
    this._sandbox = this._mockSandbox;
  }
}

describe("E2BSandboxFile", () => {
  let mockClient: E2BMockClient;
  let sandboxFile: E2BSandboxFile;

  beforeEach(() => {
    mockClient = new E2BMockClient({ sandboxId: "test-sandbox-id" });
    sandboxFile = new E2BSandboxFile(mockClient);
    jest.clearAllMocks();
  });

  describe("copy", () => {
    it("should throw Unimplemented error", async () => {
      await expect(
        sandboxFile.copy({ oldPath: "/old", newPath: "/new" })
      ).rejects.toThrow(
        new ClientError(ClientErrorCode.Unimplemented, "Not implemented", false)
      );
    });
  });

  describe("delete", () => {
    it("should delete file successfully", async () => {
      const input = { path: "/test/file.txt" };

      await sandboxFile.delete(input);

      expect(mockClient._sandbox.files.remove).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.remove).toHaveBeenCalledWith(
        "/test/file.txt"
      );
    });

    it("should throw error when sandbox is not instantiated", async () => {
      mockClient.setSandboxNull();

      const input = { path: "/test/file.txt" };

      await expect(sandboxFile.delete(input)).rejects.toThrow(
        new ClientError(
          ClientErrorCode.ImplementationError,
          "Sandbox is not instantiated. Call start() or resume() first.",
          false
        )
      );

      // Note: We can't check mockClient._sandbox.files.remove since sandbox is null
    });
  });

  describe("download", () => {
    it("should throw Unimplemented error", async () => {
      await expect(
        sandboxFile.download({ path: "/test/file.txt" })
      ).rejects.toThrow(
        new ClientError(ClientErrorCode.Unimplemented, "Not implemented", false)
      );
    });
  });

  describe("list", () => {
    it("should list files successfully", async () => {
      const mockFiles = [
        { name: "file1.txt", path: "/dir/file1.txt", type: "file" },
        { name: "subdir", path: "/dir/subdir", type: "directory" },
      ];

      (mockClient._sandbox.files.list as any).mockResolvedValue(mockFiles);

      const input = { path: "/dir" };
      const result = await sandboxFile.list(input);

      expect(mockClient._sandbox.files.list).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.list).toHaveBeenCalledWith("/dir");
      expect(result).toEqual({
        files: [
          { name: "file1.txt", path: "/dir/file1.txt", type: "file" },
          { name: "subdir", path: "/dir/subdir", type: "directory" },
        ],
      });
    });

    it("should throw error when sandbox is not instantiated", async () => {
      mockClient.setSandboxNull();

      const input = { path: "/dir" };

      await expect(sandboxFile.list(input)).rejects.toThrow(
        new ClientError(
          ClientErrorCode.ImplementationError,
          "Sandbox is not instantiated. Call start() or resume() first.",
          false
        )
      );
    });
  });

  describe("read", () => {
    it("should read file successfully", async () => {
      const mockData = "file content";
      (mockClient._sandbox.files.read as any).mockResolvedValue(mockData);

      const input = { path: "/test/file.txt" };
      const result = await sandboxFile.read(input);

      expect(mockClient._sandbox.files.read).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.read).toHaveBeenCalledWith(
        "/test/file.txt"
      );
      expect(result).toEqual({ data: mockData });
    });

    it("should throw FileNotFound error when file doesn't exist", async () => {
      (mockClient._sandbox.files.read as any).mockResolvedValue(null);

      const input = { path: "/test/file.txt" };

      await expect(sandboxFile.read(input)).rejects.toThrow(
        new ClientError(ClientErrorCode.FileNotFound, "File not found", false)
      );

      expect(mockClient._sandbox.files.read).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.read).toHaveBeenCalledWith(
        "/test/file.txt"
      );
    });

    it("should throw error when sandbox is not instantiated", async () => {
      mockClient.setSandboxNull();

      const input = { path: "/test/file.txt" };

      await expect(sandboxFile.read(input)).rejects.toThrow(
        new ClientError(
          ClientErrorCode.ImplementationError,
          "Sandbox is not instantiated. Call start() or resume() first.",
          false
        )
      );
    });
  });

  describe("rename", () => {
    it("should rename file successfully", async () => {
      const input = { oldPath: "/old/file.txt", newPath: "/new/file.txt" };

      await sandboxFile.rename(input);

      expect(mockClient._sandbox.files.rename).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.rename).toHaveBeenCalledWith(
        "/old/file.txt",
        "/new/file.txt"
      );
    });

    it("should throw error when sandbox is not instantiated", async () => {
      mockClient.setSandboxNull();

      const input = { oldPath: "/old/file.txt", newPath: "/new/file.txt" };

      await expect(sandboxFile.rename(input)).rejects.toThrow(
        new ClientError(
          ClientErrorCode.ImplementationError,
          "Sandbox is not instantiated. Call start() or resume() first.",
          false
        )
      );
    });
  });

  describe("stat", () => {
    it("should get file info successfully for file", async () => {
      const mockFileInfo = { type: "file" };
      (mockClient._sandbox.files.getInfo as any).mockResolvedValue(
        mockFileInfo
      );

      const input = { path: "/test/file.txt" };
      const result = await sandboxFile.stat(input);

      expect(mockClient._sandbox.files.getInfo).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.getInfo).toHaveBeenCalledWith(
        "/test/file.txt"
      );
      expect(result).toEqual({ type: "file" });
    });

    it("should get file info successfully for directory", async () => {
      const mockFileInfo = { type: "directory" };
      (mockClient._sandbox.files.getInfo as any).mockResolvedValue(
        mockFileInfo
      );

      const input = { path: "/test/dir" };
      const result = await sandboxFile.stat(input);

      expect(mockClient._sandbox.files.getInfo).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.getInfo).toHaveBeenCalledWith(
        "/test/dir"
      );
      expect(result).toEqual({ type: "directory" });
    });

    it("should throw FileNotFound error when file doesn't exist", async () => {
      (mockClient._sandbox.files.getInfo as any).mockResolvedValue(null);

      const input = { path: "/test/file.txt" };

      await expect(sandboxFile.stat(input)).rejects.toThrow(
        new ClientError(ClientErrorCode.FileNotFound, "File not found", false)
      );

      expect(mockClient._sandbox.files.getInfo).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.getInfo).toHaveBeenCalledWith(
        "/test/file.txt"
      );
    });

    it("should throw error when sandbox is not instantiated", async () => {
      mockClient.setSandboxNull();

      const input = { path: "/test/file.txt" };

      await expect(sandboxFile.stat(input)).rejects.toThrow(
        new ClientError(
          ClientErrorCode.ImplementationError,
          "Sandbox is not instantiated. Call start() or resume() first.",
          false
        )
      );
    });
  });

  describe("write", () => {
    it("should write single file successfully", async () => {
      const input = {
        files: [
          {
            path: "/test/file.txt",
            data: "file content",
            overwrite: true,
          },
        ],
      };

      await sandboxFile.write(input);

      expect(mockClient._sandbox.files.write).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.write).toHaveBeenCalledWith([
        { path: "/test/file.txt", data: "file content" },
      ]);
    });

    it("should write multiple files successfully", async () => {
      const input = {
        files: [
          { path: "/test/file1.txt", data: "content1", overwrite: true },
          { path: "/test/file2.txt", data: "content2", overwrite: false },
        ],
      };

      await sandboxFile.write(input);

      expect(mockClient._sandbox.files.write).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.write).toHaveBeenCalledWith([
        { path: "/test/file1.txt", data: "content1" },
        { path: "/test/file2.txt", data: "content2" },
      ]);
    });

    it("should skip existing files when overwrite is false", async () => {
      (mockClient._sandbox.files.exists as any).mockResolvedValue(true);

      const input = {
        files: [
          {
            path: "/test/file.txt",
            data: "file content",
            overwrite: false,
          },
        ],
      };

      await sandboxFile.write(input);

      expect(mockClient._sandbox.files.exists).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.exists).toHaveBeenCalledWith(
        "/test/file.txt"
      );
      expect(mockClient._sandbox.files.write).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.write).toHaveBeenCalledWith([]);
    });

    it("should write file when overwrite is false and file doesn't exist", async () => {
      (mockClient._sandbox.files.exists as any).mockResolvedValue(false);

      const input = {
        files: [
          {
            path: "/test/file.txt",
            data: "file content",
            overwrite: false,
          },
        ],
      };

      await sandboxFile.write(input);

      expect(mockClient._sandbox.files.exists).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.exists).toHaveBeenCalledWith(
        "/test/file.txt"
      );
      expect(mockClient._sandbox.files.write).toHaveBeenCalledTimes(1);
      expect(mockClient._sandbox.files.write).toHaveBeenCalledWith([
        { path: "/test/file.txt", data: "file content" },
      ]);
    });

    it("should throw error when sandbox is not instantiated", async () => {
      mockClient.setSandboxNull();

      const input = {
        files: [
          {
            path: "/test/file.txt",
            data: "file content",
            overwrite: true,
          },
        ],
      };

      await expect(sandboxFile.write(input)).rejects.toThrow(
        new ClientError(
          ClientErrorCode.ImplementationError,
          "Sandbox is not instantiated. Call start() or resume() first.",
          false
        )
      );
    });
  });
});
