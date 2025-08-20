import { ClientError, ClientErrorCode } from "@/provider/definition";
import { E2BClient } from "../..";
import {
  SandboxFile,
  SandboxFileCopyInput,
  SandboxFileCopyOutput,
  SandboxFileDeleteInput,
  SandboxFileDeleteOutput,
  SandboxFileDownloadInput,
  SandboxFileDownloadOutput,
  SandboxFileListInput,
  SandboxFileListOutput,
  SandboxFileReadInput,
  SandboxFileReadOutput,
  SandboxFileRenameInput,
  SandboxFileRenameOutput,
  SandboxFileStatInput,
  SandboxFileStatOutput,
  SandboxFileWriteOutput,
  SandboxFileWriteInput,
} from "../../../definition/sandbox/file";
import { NotFoundError } from "@e2b/code-interpreter";
import path from "path";

export class E2BSandboxFile extends SandboxFile<E2BClient> {
  // the folder to store the files in the sandbox
  // when creating a new template, the code must be stored in this folder
  protected folder: string = "/code";

  constructor(client: E2BClient) {
    super(client);
  }

  async copy(input: SandboxFileCopyInput): Promise<SandboxFileCopyOutput> {
    throw new ClientError(
      ClientErrorCode.Unimplemented,
      "Not implemented",
      false
    );
  }

  async delete(
    input: SandboxFileDeleteInput
  ): Promise<SandboxFileDeleteOutput> {
    if (!this.client._sandbox) {
      throw new ClientError(
        ClientErrorCode.ImplementationError,
        "Sandbox is not instantiated. Call start() or resume() first.",
        false
      );
    }
    await this.client._sandbox.files.remove(this.fullpath(input.path));
    return {};
  }

  async download(
    input: SandboxFileDownloadInput
  ): Promise<SandboxFileDownloadOutput> {
    throw new ClientError(
      ClientErrorCode.Unimplemented,
      "Not implemented",
      false
    );
  }

  async list(input: SandboxFileListInput): Promise<SandboxFileListOutput> {
    if (!this.client._sandbox) {
      throw new ClientError(
        ClientErrorCode.ImplementationError,
        "Sandbox is not instantiated. Call start() or resume() first.",
        false
      );
    }
    try {
      const p = path.normalize(this.fullpath(input.path));
      const files = await this.client._sandbox.files.list(p);
      return {
        files: files.map((file) => ({
          name: file.name,
          path: file.path.replace(this.folder, ""),
          type: file.type === "file" ? "file" : "directory",
        })),
      };
    } catch (e) {
      if (e instanceof NotFoundError) {
        throw new ClientError(
          ClientErrorCode.FileNotFound,
          "Folder or file not found",
          false
        );
      }
      throw e;
    }
  }

  async read(input: SandboxFileReadInput): Promise<SandboxFileReadOutput> {
    if (!this.client._sandbox) {
      throw new ClientError(
        ClientErrorCode.ImplementationError,
        "Sandbox is not instantiated. Call start() or resume() first.",
        false
      );
    }
    try {
      const data = await this.client._sandbox.files.read(
        this.fullpath(input.path)
      );
      if (!data) {
        throw new ClientError(
          ClientErrorCode.FileNotFound,
          "File not found",
          false
        );
      }

      return {
        data,
      };
    } catch (e) {
      if (e instanceof NotFoundError) {
        throw new ClientError(
          ClientErrorCode.FileNotFound,
          "File not found",
          false
        );
      }
      throw e;
    }
  }

  async rename(
    input: SandboxFileRenameInput
  ): Promise<SandboxFileRenameOutput> {
    if (!this.client._sandbox) {
      throw new ClientError(
        ClientErrorCode.ImplementationError,
        "Sandbox is not instantiated. Call start() or resume() first.",
        false
      );
    }
    await this.client._sandbox.files.rename(
      this.fullpath(input.oldPath),
      this.fullpath(input.newPath)
    );
    return {};
  }

  async stat(input: SandboxFileStatInput): Promise<SandboxFileStatOutput> {
    if (!this.client._sandbox) {
      throw new ClientError(
        ClientErrorCode.ImplementationError,
        "Sandbox is not instantiated. Call start() or resume() first.",
        false
      );
    }
    const file = await this.client._sandbox.files.getInfo(
      this.fullpath(input.path)
    );
    if (!file) {
      throw new ClientError(
        ClientErrorCode.FileNotFound,
        "File not found",
        false
      );
    }
    return {
      type: file.type === "file" ? "file" : "directory",
    };
  }

  async write(input: SandboxFileWriteInput): Promise<SandboxFileWriteOutput> {
    if (!this.client._sandbox) {
      throw new ClientError(
        ClientErrorCode.ImplementationError,
        "Sandbox is not instantiated. Call start() or resume() first.",
        false
      );
    }
    const files: { path: string; data: string }[] = [];
    for (const file of Array.isArray(input.files)
      ? input.files
      : [input.files]) {
      if (!file.overwrite) {
        const exists = await this.client._sandbox.files.exists(
          this.fullpath(file.path)
        );
        if (exists) {
          continue;
        }
      }
      files.push({
        path: this.fullpath(file.path),
        data: file.data,
      });
    }
    await this.client._sandbox.files.write(files);
    return {};
  }

  protected fullpath(path: string): string {
    return this.folder + (path.startsWith("/") ? "" : "/") + path;
  }
}
