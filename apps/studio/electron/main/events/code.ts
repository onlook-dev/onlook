import type { CodeDiff, CodeDiffRequest } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { TemplateNode } from '@onlook/models/element';
import { ipcMain } from 'electron';
import { openFileInIde, openInIde, pickDirectory, readCodeBlock, writeCode } from '../code/';
import { getTemplateNodeClass } from '../code/classes';
import { extractComponentsFromDirectory } from '../code/components';
import { getCodeDiffs } from '../code/diff';
import { readFile } from '../code/files';
import { getTemplateNodeChild } from '../code/templateNode';
import runManager from '../run';
import { getFileContentWithoutIds } from '../run/cleanup';

export function listenForCodeMessages() {
    ipcMain.handle(MainChannels.VIEW_SOURCE_CODE, (e: Electron.IpcMainInvokeEvent, args) => {
        const oid = args as string;
        const templateNode = runManager.getTemplateNode(oid);
        if (!templateNode) {
            console.error('Failed to get code block. No template node found.');
            return;
        }
        openInIde(templateNode);
    });

    ipcMain.handle(MainChannels.VIEW_SOURCE_FILE, (e: Electron.IpcMainInvokeEvent, args) => {
        const filePath = args as string;
        openFileInIde(filePath);
    });

    ipcMain.handle(MainChannels.GET_CODE_BLOCK, (e: Electron.IpcMainInvokeEvent, args) => {
        const oid = args as string;
        const templateNode = runManager.getTemplateNode(oid);
        if (!templateNode) {
            console.error('Failed to get code block. No template node found.');
            return null;
        }
        return readCodeBlock(templateNode);
    });

    ipcMain.handle(MainChannels.GET_FILE_CONTENT, (e: Electron.IpcMainInvokeEvent, args) => {
        const { filePath, stripIds } = args as {
            filePath: string;
            stripIds: boolean;
        };

        if (stripIds) {
            return getFileContentWithoutIds(filePath);
        }
        return readFile(filePath);
    });

    ipcMain.handle(MainChannels.GET_TEMPLATE_NODE_CLASS, (e: Electron.IpcMainInvokeEvent, args) => {
        const templateNode = args as TemplateNode;
        return getTemplateNodeClass(templateNode);
    });

    ipcMain.handle(MainChannels.WRITE_CODE_DIFFS, async (e: Electron.IpcMainInvokeEvent, args) => {
        const codeResults = args as CodeDiff[];
        const res = await writeCode(codeResults);
        return res;
    });

    ipcMain.handle(
        MainChannels.GET_AND_WRITE_CODE_DIFFS,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            const { requests, write } = args as { requests: CodeDiffRequest[]; write: boolean };
            const codeDiffs = await getCodeDiffs(requests);
            if (write) {
                return writeCode(codeDiffs);
            }
            return codeDiffs;
        },
    );

    ipcMain.handle(MainChannels.GET_TEMPLATE_NODE_CHILD, (e: Electron.IpcMainInvokeEvent, args) => {
        const { parent, child, index } = args as {
            parent: TemplateNode;
            child: TemplateNode;
            index: number;
        };
        return getTemplateNodeChild(parent, child, index);
    });

    ipcMain.handle(MainChannels.PICK_COMPONENTS_DIRECTORY, async () => {
        const result = await pickDirectory();
        if (result.canceled) {
            return null;
        }

        return result.filePaths.at(0) ?? null;
    });

    ipcMain.handle(MainChannels.GET_COMPONENTS, async (_, args) => {
        if (typeof args !== 'string') {
            throw new Error('`args` must be a string');
        }
        const result = extractComponentsFromDirectory(args);
        return result;
    });
}
