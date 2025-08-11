import { CUSTOM_OUTPUT_DIR, DefaultSettings, SUPPORTED_LOCK_FILES } from '@onlook/constants';
import type { Deployment, deploymentUpdateSchema } from '@onlook/db';
import { addBuiltWithScript, injectBuiltWithScript } from '@onlook/growth';
import { DeploymentStatus } from '@onlook/models';
import { addNextBuildConfig } from '@onlook/parser';
import {
  isEmptyString,
  isNullOrUndefined,
  updateGitignore,
  type FileOperations,
} from '@onlook/utility';
import { addDeploymentLog } from './helpers/logs';
import type { z } from 'zod';

type SandboxFileLike = {
  type: 'text' | 'binary';
  content: string | Uint8Array | null;
  toString(): string;
};

type DeploymentProvider = {
  readFile(input: { args: { path: string } }): Promise<{ file: SandboxFileLike }>;
  writeFile(input: { args: { path: string; content: string | Uint8Array; overwrite?: boolean } }): Promise<{ success: boolean }>;
  statFile(input: { args: { path: string } }): Promise<{ type: 'file' | 'directory' }>
  copyFiles(input: { args: { sourcePath: string; targetPath: string; recursive?: boolean; overwrite?: boolean } }): Promise<unknown>;
  deleteFiles(input: { args: { path: string; recursive?: boolean } }): Promise<unknown>;
  runCommand(input: { args: { command: string } }): Promise<{ output: string }>;
  downloadFiles(input: { args: { path: string } }): Promise<{ url?: string }>;
};

export class PublishManager {
  constructor(private readonly provider: DeploymentProvider) {}

  private get fileOperations(): FileOperations {
    return {
      readFile: async (path: string) => {
        const { file } = await this.provider.readFile({ args: { path } });
        return file.toString();
      },
      writeFile: async (path: string, content: string) => {
        const res = await this.provider.writeFile({
          args: { path, content, overwrite: true },
        });
        return res.success;
      },
      fileExists: async (path: string) => {
        try {
          const stat = await this.provider.statFile({ args: { path } });
          return stat.type === 'file';
        } catch (error) {
          console.error(`Error checking file existence at ${path}:`, error);
          return false;
        }
      },
      copy: async (source: string, destination: string, recursive?: boolean, overwrite?: boolean) => {
        await this.provider.copyFiles({
          args: { sourcePath: source, targetPath: destination, recursive, overwrite },
        });
        return true;
      },
      delete: async (path: string, recursive?: boolean) => {
        await this.provider.deleteFiles({ args: { path, recursive } });
        return true;
      },
    };
  }

  private async addBadge(folderPath: string) {
    await injectBuiltWithScript(folderPath, this.fileOperations);
    await addBuiltWithScript(folderPath, this.fileOperations);
  }

  private async prepareProject() {
    const preprocessSuccess = await addNextBuildConfig(this.fileOperations);
    if (!preprocessSuccess) {
      throw new Error('Failed to prepare project for deployment');
    }
    const gitignoreSuccess = await updateGitignore(CUSTOM_OUTPUT_DIR, this.fileOperations);
    if (!gitignoreSuccess) {
      console.warn('Failed to update .gitignore');
    }
  }

  private async runBuildStep(buildScript: string, buildFlags: string): Promise<void> {
    try {
      const buildFlagsString = isNullOrUndefined(buildFlags)
        ? DefaultSettings.EDITOR_SETTINGS.buildFlags
        : buildFlags;

      const buildCommand = isEmptyString(buildFlagsString)
        ? buildScript
        : `${buildScript} -- ${buildFlagsString}`;

      const { output } = await this.provider.runCommand({ args: { command: buildCommand } });
      console.log('Build output: ', output);
    } catch (error) {
      console.error('Failed to run build step', error);
      throw error;
    }
  }

  private async postprocessBuild(): Promise<{ success: boolean; error?: string }> {
    const entrypointExists = await this.fileOperations.fileExists(
      `${CUSTOM_OUTPUT_DIR}/standalone/server.js`,
    );

    if (!entrypointExists) {
      return {
        success: false,
        error: `Failed to find entrypoint server.js in ${CUSTOM_OUTPUT_DIR}/standalone`,
      } as const;
    }

    await this.fileOperations.copy(`public`, `${CUSTOM_OUTPUT_DIR}/standalone/public`, true, true);
    await this.fileOperations.copy(
      `${CUSTOM_OUTPUT_DIR}/static`,
      `${CUSTOM_OUTPUT_DIR}/standalone/${CUSTOM_OUTPUT_DIR}/static`,
      true,
      true,
    );

    for (const lockFile of SUPPORTED_LOCK_FILES) {
      const lockFileExists = await this.fileOperations.fileExists(`./${lockFile}`);
      if (lockFileExists) {
        await this.fileOperations.copy(
          `./${lockFile}`,
          `${CUSTOM_OUTPUT_DIR}/standalone/${lockFile}`,
          true,
          true,
        );
        return { success: true };
      }
    }

    return {
      success: false,
      error: 'Failed to find lock file. Supported lock files: ' + SUPPORTED_LOCK_FILES.join(', '),
    };
  }

  private getProcessMemoryUsageSnapshot(): {
    rssMB: number;
    heapTotalMB: number;
    heapUsedMB: number;
    externalMB: number;
    arrayBuffersMB: number;
  } {
    const mem =
      typeof process !== 'undefined' && process.memoryUsage
        ? process.memoryUsage()
        : ({} as NodeJS.MemoryUsage);
    const toMB = (bytes: number | undefined) =>
      typeof bytes === 'number' ? +(bytes / (1024 * 1024)).toFixed(2) : 0;
    return {
      rssMB: toMB(mem.rss),
      heapTotalMB: toMB(mem.heapTotal),
      heapUsedMB: toMB(mem.heapUsed),
      externalMB: toMB(mem.external),
      arrayBuffersMB: toMB((mem as unknown as { arrayBuffers?: number }).arrayBuffers),
    };
  }

  private logMemoryUsage(label: string, deploymentId?: string): void {
    const mem = this.getProcessMemoryUsageSnapshot();
    const message = `${label} – Memory (MB): rss=${mem.rssMB}, heapUsed=${mem.heapUsedMB}, heapTotal=${mem.heapTotalMB}, external=${mem.externalMB}, arrayBuffers=${mem.arrayBuffersMB}`;
    console.log(message);
    if (deploymentId) {
      addDeploymentLog(deploymentId, message, 'debug');
    }
  }

  // New flow: build → postprocess → archive → upload → return signed URL
  async buildAndUploadArtifact({
    buildScript,
    buildFlags,
    skipBadge,
    deploymentId,
    updateDeployment,
  }: {
    buildScript: string;
    buildFlags: string;
    skipBadge: boolean;
    deploymentId: string;
    updateDeployment: (deployment: z.infer<typeof deploymentUpdateSchema>) => Promise<Deployment | null>;
  }): Promise<string> {
    await this.prepareProject();
    addDeploymentLog(deploymentId, 'Project prepared for deployment', 'debug');
    this.logMemoryUsage('After prepareProject', deploymentId);
    await updateDeployment({
      status: DeploymentStatus.IN_PROGRESS,
      message: 'Preparing deployment...',
      progress: 30,
    });

    if (!skipBadge) {
      await updateDeployment({
        status: DeploymentStatus.IN_PROGRESS,
        message: 'Adding "Built with Onlook" badge...',
        progress: 35,
      });
      await this.addBadge('./');
      addDeploymentLog(deploymentId, 'Badge injected', 'debug');
      this.logMemoryUsage('After badge injection', deploymentId);
    }

    await updateDeployment({
      status: DeploymentStatus.IN_PROGRESS,
      message: 'Building project...',
      progress: 40,
    });
    addDeploymentLog(
      deploymentId,
      `Running build: ${buildScript} ${buildFlags ?? ''}`.trim(),
      'info',
    );
    this.logMemoryUsage('Before build', deploymentId);
    await this.runBuildStep(buildScript, buildFlags);
    addDeploymentLog(deploymentId, 'Build step completed', 'success');
    this.logMemoryUsage('After build', deploymentId);

    await updateDeployment({
      status: DeploymentStatus.IN_PROGRESS,
      message: 'Postprocessing project...',
      progress: 50,
    });

    const { success: postprocessSuccess, error: postprocessError } = await this.postprocessBuild();
    if (!postprocessSuccess) {
      addDeploymentLog(
        deploymentId,
        `Postprocess failed: ${postprocessError ?? ''}`,
        'error',
      );
      throw new Error(
        `Failed to postprocess project for deployment: ${postprocessError}`,
      );
    }
    addDeploymentLog(deploymentId, 'Postprocess completed', 'success');
    this.logMemoryUsage('After postprocess', deploymentId);

    const NEXT_BUILD_OUTPUT_PATH = `${CUSTOM_OUTPUT_DIR}/standalone`;

    await updateDeployment({
      status: DeploymentStatus.IN_PROGRESS,
      message: 'Creating build artifact...',
      progress: 60,
    });

    const artifactLocalPath = `${CUSTOM_OUTPUT_DIR}/standalone.tar.gz`;
    const tarCommand = `tar -czf ${artifactLocalPath} -C ${NEXT_BUILD_OUTPUT_PATH} .`;
    addDeploymentLog(deploymentId, 'Creating tar.gz artifact', 'debug');
    await this.provider.runCommand({ args: { command: tarCommand } });
    this.logMemoryUsage('After tar artifact creation', deploymentId);

    await updateDeployment({
      status: DeploymentStatus.IN_PROGRESS,
      message: 'Preparing artifact URL...',
      progress: 70,
    });

    // Get a provider-hosted download URL for the artifact to avoid loading bytes into memory
    const { url: downloadUrl } = await this.provider.downloadFiles({
      args: { path: artifactLocalPath },
    });
    if (!downloadUrl) {
      addDeploymentLog(deploymentId, 'Failed to get artifact download URL', 'error');
      throw new Error('Failed to get artifact download URL');
    }
    addDeploymentLog(deploymentId, 'Artifact download URL ready', 'success');
    this.logMemoryUsage('After preparing artifact URL', deploymentId);

    await updateDeployment({
      status: DeploymentStatus.IN_PROGRESS,
      message: 'Artifact ready. Deploying...',
      progress: 80,
    });
    addDeploymentLog(
      deploymentId,
      'Artifact URL prepared; proceeding to deployment',
      'success',
    );

    // NOTE: Do not delete the artifact yet to prevent race during provider fetch.
    // The sandbox may be ephemeral; hosting should fetch immediately.
    return String(downloadUrl);
  }
}
