import { tool, type SdkMcpToolDefinition } from '@anthropic-ai/claude-agent-sdk';
import type { ProjectSetupAction, ProjectSetupResult, ProjectSetupSnapshot } from '@studio/events';
import { z } from 'zod';
import { PROJECT_SETUP_TOOL_NAMES } from './tool-names.js';
import { serverWasStopped } from '../server/user-stop.js';

export interface ProjectSetupToolSinks {
  read(): ProjectSetupSnapshot;
  save(definition: unknown, expectedRevision: string | null): ProjectSetupResult;
  run(action: ProjectSetupAction): Promise<ProjectSetupResult>;
}

export function respectServerStop(cwd: string, sinks: ProjectSetupToolSinks): ProjectSetupToolSinks {
  return {
    ...sinks,
    run: async (action) => {
      const snapshot = sinks.read();
      const servers = snapshot.saved?.definition.servers;
      const endpoints = servers
        ?.filter((server) => action.serverIds === undefined || action.serverIds.includes(server.id))
        .map((server) => ({ folder: `${cwd}/${server.cwd}`, port: server.port }));
      const unmapped = action.serverIds?.some((id) => !servers?.some((server) => server.id === id)) === true;
      if (action.action !== 'stop' && serverWasStopped(cwd, unmapped ? undefined : endpoints)) {
        return { ok: false, reason: 'The user stopped this server. Leave it stopped until they press Start.', snapshot };
      }
      return sinks.run(action);
    },
  };
}

const definition = z.object({
  prepare: z.string().max(65536),
  install: z.object({ script: z.string().max(65536), inputs: z.array(z.string()), outputs: z.array(z.string()) }).strict(),
  servers: z.array(z.object({ id: z.string().min(1), cwd: z.string().min(1), start: z.string().min(1).max(65536), port: z.number().int().min(1).max(65535) }).strict()).min(1).max(32),
}).strict();
const runAction = z.object({ action: z.enum(['start', 'stop', 'restart']), serverIds: z.array(z.string()).optional() }).strict();
const respond = (value: ProjectSetupSnapshot | ProjectSetupResult) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], ...('ok' in value && !value.ok ? { isError: true } : {}) });

export function projectSetupTools(sinks: ProjectSetupToolSinks): SdkMcpToolDefinition<never>[] {
  return [
    tool(PROJECT_SETUP_TOOL_NAMES.read, "Read this project's saved setup, verified revision and retained failure. Takes no project path.", {}, async () => respond(sinks.read()), { alwaysLoad: true, annotations: { title: 'Read setup script', readOnlyHint: true, destructiveHint: false } }) as never,
    tool(PROJECT_SETUP_TOOL_NAMES.save, 'Save a reusable setup script outside the repository. First read get_project_setup and pass saved.revision as expectedRevision, or null for no saved script. Include repeatable POSIX prepare activation and prerequisite checks, installation input files and output sentinels, and foreground servers with contained relative cwd and ports. A start command can explicitly opt into automatic port changes by using {{port}} wherever its port is needed, for example npm run dev -- --port {{port}} --strictPort. Onlook substitutes the saved port and, only if another project or app occupies it, chooses a free port and updates the saved setup and Frames. Use this only when the command supports choosing a port. Fixed-port commands keep their existing repair path. Never embed credentials. Saving does not verify execution. Keep commands in the foreground without nohup or shell backgrounding.', { definition, expectedRevision: z.string().nullable() }, async (args) => respond(sinks.save(definition.parse(args.definition), z.string().nullable().parse(args.expectedRevision))), { alwaysLoad: true, annotations: { title: 'Save setup script', readOnlyHint: false, destructiveHint: true } }) as never,
    tool(PROJECT_SETUP_TOOL_NAMES.run, 'Start, stop or restart the saved setup using Onlook-owned processes independent of this conversation. Installation is reused only when input hashes and output sentinels match. Returns the actual retained command failure or measured readiness. Optional serverIds restrict the operation to saved server ids.', runAction.shape, async (args) => respond(await sinks.run(runAction.parse(args))), { alwaysLoad: true, annotations: { title: 'Run setup script', readOnlyHint: false, destructiveHint: true } }) as never,
  ];
}
