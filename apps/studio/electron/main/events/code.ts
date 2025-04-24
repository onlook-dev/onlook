import type { CodeDiff, CodeDiffRequest } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { TemplateNode } from '@onlook/models/element';
import { ipcMain } from 'electron';
import {
    addFont,
    addLocalFont,
    getDefaultFont,
    removeFont,
    scanFonts,
    setDefaultFont,
} from '../assets/fonts/index';
import { FontFileWatcher } from '../assets/fonts/watcher';
import {
    deleteTailwindColorGroup,
    scanTailwindConfig,
    updateTailwindColorConfig,
} from '../assets/styles';
import { openFileInIde, openInIde, pickDirectory, readCodeBlock, writeCode } from '../code/';
import { getTemplateNodeClass } from '../code/classes';
import { extractComponentsFromDirectory } from '../code/components';
import { getCodeDiffs } from '../code/diff';
import { isChildTextEditable } from '../code/diff/text';
import { readFile } from '../code/files';
import { fileWatcher } from '../code/fileWatcher';
import { getTemplateNodeProps } from '../code/props';
import { getTemplateNodeChild } from '../code/templateNode';
import runManager from '../run';
import { getFileContentWithoutIds } from '../run/cleanup';

const fontFileWatcher = new FontFileWatcher();

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
        const { filePath, line } = args as {
            filePath: string;
            line?: number;
        };
        openFileInIde(filePath, line);
    });

    ipcMain.handle(MainChannels.GET_CODE_BLOCK, (e: Electron.IpcMainInvokeEvent, args) => {
        const { oid, stripIds } = args as {
            oid: string;
            stripIds: boolean;
        };
        const templateNode = runManager.getTemplateNode(oid);
        if (!templateNode) {
            console.error('Failed to get code block. No template node found.');
            return null;
        }
        return readCodeBlock(templateNode, stripIds);
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

    ipcMain.handle(
        MainChannels.IS_CHILD_TEXT_EDITABLE,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            const { oid } = args as { oid: string };
            return isChildTextEditable(oid);
        },
    );

    ipcMain.handle(MainChannels.GET_TEMPLATE_NODE_PROPS, (e: Electron.IpcMainInvokeEvent, args) => {
        const templateNode = args as TemplateNode;
        return getTemplateNodeProps(templateNode);
    });

    ipcMain.handle(
        MainChannels.SCAN_TAILWIND_CONFIG,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            const { projectRoot } = args as { projectRoot: string };
            return scanTailwindConfig(projectRoot);
        },
    );

    ipcMain.handle(MainChannels.UPDATE_TAILWIND_CONFIG, async (e, args) => {
        const { projectRoot, originalKey, newColor, newName, parentName, theme } = args;
        return updateTailwindColorConfig(
            projectRoot,
            originalKey,
            newColor,
            newName,
            theme,
            parentName,
        );
    });

    ipcMain.handle(MainChannels.DELETE_TAILWIND_CONFIG, async (_, args) => {
        const { projectRoot, groupName, colorName } = args;
        return deleteTailwindColorGroup(projectRoot, groupName, colorName);
    });

    ipcMain.handle(MainChannels.SCAN_FONTS, async (_, args) => {
        const { projectRoot } = args;

        return scanFonts(projectRoot);
    });

    ipcMain.handle(MainChannels.ADD_FONT, async (_, args) => {
        const { projectRoot, font } = args;
        return addFont(projectRoot, font);
    });

    ipcMain.handle(MainChannels.REMOVE_FONT, async (_, args) => {
        const { projectRoot, font } = args;
        return removeFont(projectRoot, font);
    });

    ipcMain.handle(MainChannels.SET_FONT, async (_, args) => {
        const { projectRoot, font } = args;
        return setDefaultFont(projectRoot, font);
    });

    ipcMain.handle(MainChannels.GET_DEFAULT_FONT, async (_, args) => {
        const { projectRoot } = args;
        return getDefaultFont(projectRoot);
    });

    ipcMain.handle(MainChannels.UPLOAD_FONTS, async (_, args) => {
        const { projectRoot, fontFiles } = args;
        return addLocalFont(projectRoot, fontFiles);
    });

    ipcMain.handle(MainChannels.WATCH_FONT_FILE, async (_, args) => {
        const { projectRoot } = args;
        return fontFileWatcher.watch(projectRoot);
    });

    ipcMain.handle(MainChannels.WATCH_FILE, async (e: Electron.IpcMainInvokeEvent, args) => {
        const { filePath } = args as { filePath: string };
        return fileWatcher.watchFile(filePath);
    });

    ipcMain.handle(MainChannels.UNWATCH_FILE, (e: Electron.IpcMainInvokeEvent, args) => {
        const { filePath } = args as { filePath: string };
        fileWatcher.unwatchFile(filePath);
        return true;
    });

    ipcMain.handle(MainChannels.MARK_FILE_MODIFIED, (e: Electron.IpcMainInvokeEvent, args) => {
        const { filePath } = args as { filePath: string };
        fileWatcher.markFileAsModified(filePath);
        return true;
    });
}
