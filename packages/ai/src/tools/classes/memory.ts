import { z } from 'zod';

import { type EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { Icons } from '@onlook/ui/icons';

import { ClientTool } from '../models/client';
import { getFileSystem } from '../shared/helpers/files';
import { BRANCH_ID_SCHEMA } from '../shared/type';

const MEMORY_PATH = '.onlook/memory.json';
const GLOBAL_MEMORY_PATH = '.onlook/global-memory.json';

const MemoryItemSchema = z.object({
    conversationId: z.string(),
    timestamp: z.string(),
    summary: z.string().optional(),
    actions: z.array(z.string()).optional(),
    data: z.any().optional(),
});

const GlobalMemoryItemSchema = z.object({
    id: z.string().optional(),
    timestamp: z.string(),
    summary: z.string().optional(),
    actions: z.array(z.string()).optional(),
    data: z.any().optional(),
    tags: z.array(z.string()).optional().describe('Tags for categorizing global memories'),
});

const MemoryReadSchema = z.object({
    conversationId: z
        .string()
        .optional()
        .describe('If provided, filters memories to a conversation'),
    scope: z
        .enum(['conversation', 'global', 'both'])
        .default('conversation')
        .describe('Memory scope: conversation-specific, global, or both'),
    branchId: BRANCH_ID_SCHEMA,
});

export class ReadMemoryTool extends ClientTool {
    static readonly toolName = 'read_memory';
    static readonly description =
        'Read AI memory from conversation-specific (.onlook/memory.json) or global (.onlook/global-memory.json) memory files. Use scope parameter to choose which memories to read.';
    static readonly parameters = MemoryReadSchema;
    static readonly icon = Icons.Save;

    async handle(
        args: z.infer<typeof MemoryReadSchema>,
        editorEngine: EditorEngine,
    ): Promise<{
        conversationItems: MemoryItem[];
        globalItems: GlobalMemoryItem[];
        conversationPath: string;
        globalPath: string;
    }> {
        console.debug('[ReadMemoryTool] called with', {
            branchId: args.branchId,
            conversationId: args.conversationId,
            scope: args.scope,
        });
        const fs = await getFileSystem(args.branchId, editorEngine);

        let conversationItems: MemoryItem[] = [];
        let globalItems: GlobalMemoryItem[] = [];

        // Read conversation-specific memory if requested
        if (args.scope === 'conversation' || args.scope === 'both') {
            try {
                const raw = await fs.readFile(MEMORY_PATH);
                const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : [];
                conversationItems = Array.isArray(parsed) ? (parsed as MemoryItem[]) : [];
                console.debug('[ReadMemoryTool] loaded conversation entries', {
                    count: conversationItems.length,
                });
            } catch {
                conversationItems = [];
                console.debug(
                    '[ReadMemoryTool] conversation memory file missing or unreadable, treating as empty',
                );
            }

            if (args.conversationId) {
                conversationItems = conversationItems.filter(
                    (i) => i && i.conversationId === args.conversationId,
                );
                console.debug('[ReadMemoryTool] filtered conversation by conversationId', {
                    count: conversationItems.length,
                });
            }
        }

        // Read global memory if requested
        if (args.scope === 'global' || args.scope === 'both') {
            try {
                const raw = await fs.readFile(GLOBAL_MEMORY_PATH);
                const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : [];
                globalItems = Array.isArray(parsed) ? (parsed as GlobalMemoryItem[]) : [];
                console.debug('[ReadMemoryTool] loaded global entries', {
                    count: globalItems.length,
                });
            } catch {
                globalItems = [];
                console.debug(
                    '[ReadMemoryTool] global memory file missing or unreadable, treating as empty',
                );
            }
        }

        return {
            conversationItems,
            globalItems,
            conversationPath: MEMORY_PATH,
            globalPath: GLOBAL_MEMORY_PATH,
        };
    }

    static getLabel(): string {
        return 'Read memory';
    }
}

export class MemoryTool extends ClientTool {
    static readonly toolName = 'memory';
    static readonly description =
        'Append or clear AI memory stored in conversation-specific (.onlook/memory.json) or global (.onlook/global-memory.json) memory files. Use scope parameter to choose which memory to modify. ';
    static readonly parameters = z.object({
        action: z.enum(['append', 'clear']).describe('Action to perform: append or clear memory'),
        scope: z
            .enum(['conversation', 'global'])
            .default('conversation')
            .describe('Memory scope: conversation-specific or global'),
        conversationId: z
            .string()
            .optional()
            .describe(
                'Conversation ID to associate with or filter by (required for conversation scope)',
            ),
        entry: z
            .object({
                timestamp: z.string().optional().describe('Timestamp for the memory entry'),
                summary: z.string().optional().describe('Summary of the memory entry'),
                actions: z.array(z.string()).optional().describe('Actions taken'),
                data: z.any().optional().describe('Additional data for the memory entry'),
                tags: z
                    .array(z.string())
                    .optional()
                    .describe('Tags for categorizing global memories (only used for global scope)'),
            })
            .optional()
            .describe('Memory entry data (required for append action)'),
        branchId: BRANCH_ID_SCHEMA.optional(),
    });
    static readonly icon = Icons.Save;

    async handle(
        args: z.infer<typeof MemoryTool.parameters>,
        editorEngine: EditorEngine,
    ): Promise<string> {
        console.debug('[MemoryTool] called with', args);
        const providedBranchId = (args as Partial<{ branchId: string }>).branchId;
        const fallbackBranchId = (() => {
            try {
                // Prefer active branch if available
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const active = (editorEngine as any)?.branches?.activeBranch?.id as
                    | string
                    | undefined;
                return active;
            } catch {
                return undefined;
            }
        })();
        const branchId = providedBranchId ?? fallbackBranchId;
        if (!branchId) {
            return 'Error: branchId is required to write memory';
        }
        console.debug('[MemoryTool] resolved branchId', {
            branchId,
            provided: !!providedBranchId,
            fromActive: !!fallbackBranchId && !providedBranchId,
        });
        const fs = await getFileSystem(branchId, editorEngine);

        if (args.scope === 'conversation') {
            return this.handleConversationMemory(args, fs);
        } else if (args.scope === 'global') {
            return this.handleGlobalMemory(args, fs);
        } else {
            return 'Error: Invalid scope. Must be "conversation" or "global"';
        }
    }

    private async handleConversationMemory(
        args: z.infer<typeof MemoryTool.parameters>,
        fs: Awaited<ReturnType<typeof getFileSystem>>,
    ): Promise<string> {
        let items: MemoryItem[] = [];
        try {
            const raw = await fs.readFile(MEMORY_PATH);
            const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : [];
            items = Array.isArray(parsed) ? (parsed as MemoryItem[]) : [];
            console.debug('[MemoryTool] loaded conversation entries', {
                count: items.length,
            });
        } catch {
            items = [];
            console.debug(
                '[MemoryTool] conversation memory file missing or unreadable, starting fresh',
            );
        }

        if (args.action === 'append') {
            if (!args.conversationId || !args.entry) {
                return 'Error: conversationId and entry are required for append action in conversation scope';
            }
            const newItem = {
                conversationId: args.conversationId,
                timestamp: args.entry.timestamp ?? new Date().toISOString(),
                summary: args.entry.summary,
                actions: args.entry.actions,
                data: args.entry.data,
            };
            items.push(newItem);
            console.debug('[MemoryTool] appended conversation entry', {
                conversationId: args.conversationId,
                total: items.length,
            });
        } else if (args.action === 'clear') {
            if (args.conversationId) {
                items = items.filter((i) => i.conversationId !== args.conversationId);
                console.debug('[MemoryTool] cleared conversation entries', {
                    conversationId: args.conversationId,
                    remaining: items.length,
                });
            } else {
                items = [];
                console.debug('[MemoryTool] cleared all conversation entries');
            }
        }

        try {
            // Ensure .onlook directory exists before writing
            await fs.createDirectory('.onlook');
            await fs.writeFile(MEMORY_PATH, JSON.stringify(items, null, 2));
            console.debug('[MemoryTool] wrote conversation memory file', {
                path: MEMORY_PATH,
                count: items.length,
            });
        } catch (error) {
            console.error('[MemoryTool] failed to write conversation memory file', { error });
            return `Error: Failed to write conversation memory: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        return `${MemoryTool.toolName} ok (conversation)`;
    }

    private async handleGlobalMemory(
        args: z.infer<typeof MemoryTool.parameters>,
        fs: Awaited<ReturnType<typeof getFileSystem>>,
    ): Promise<string> {
        let items: GlobalMemoryItem[] = [];
        try {
            const raw = await fs.readFile(GLOBAL_MEMORY_PATH);
            const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : [];
            items = Array.isArray(parsed) ? (parsed as GlobalMemoryItem[]) : [];
            console.debug('[MemoryTool] loaded global entries', {
                count: items.length,
            });
        } catch {
            items = [];
            console.debug('[MemoryTool] global memory file missing or unreadable, starting fresh');
        }

        if (args.action === 'append') {
            if (!args.entry) {
                return 'Error: entry is required for append action in global scope';
            }
            const newItem: GlobalMemoryItem = {
                id: args.entry.timestamp ?? new Date().toISOString(), // Use timestamp as ID if not provided
                timestamp: args.entry.timestamp ?? new Date().toISOString(),
                summary: args.entry.summary,
                actions: args.entry.actions,
                data: args.entry.data,
                tags: args.entry.tags,
            };
            items.push(newItem);
            console.debug('[MemoryTool] appended global entry', {
                id: newItem.id,
                total: items.length,
            });
        } else if (args.action === 'clear') {
            items = [];
            console.debug('[MemoryTool] cleared all global entries');
        }

        try {
            // Ensure .onlook directory exists before writing
            await fs.createDirectory('.onlook');
            await fs.writeFile(GLOBAL_MEMORY_PATH, JSON.stringify(items, null, 2));
            console.debug('[MemoryTool] wrote global memory file', {
                path: GLOBAL_MEMORY_PATH,
                count: items.length,
            });
        } catch (error) {
            console.error('[MemoryTool] failed to write global memory file', { error });
            return `Error: Failed to write global memory: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        return `${MemoryTool.toolName} ok (global)`;
    }

    static getLabel(input?: z.infer<typeof MemoryTool.parameters>): string {
        const scope = input?.scope ?? 'conversation';
        if (input?.action === 'append') return `Memory: append (${scope})`;
        if (input?.action === 'clear') return `Memory: clear (${scope})`;
        return `Memory (${scope})`;
    }
}

type MemoryItem = z.infer<typeof MemoryItemSchema>;
type GlobalMemoryItem = z.infer<typeof GlobalMemoryItemSchema>;
