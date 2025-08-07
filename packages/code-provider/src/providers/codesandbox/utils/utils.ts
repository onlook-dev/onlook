import type { WebSocketSession } from '@codesandbox/sdk';
import { NEXT_JS_FILE_EXTENSIONS } from '@onlook/constants';
import { RouterType, type SandboxFile } from '@onlook/models';
import {
    addOidsToAst,
    getAstFromContent,
    getContentFromAst,
    injectPreloadScript,
} from '@onlook/parser';
import {
    getBaseName,
    getDirName,
    isImageFile,
    isRootLayoutFile,
    normalizePath,
} from '@onlook/utility';
import path from 'path';
import parserEstree from 'prettier/plugins/estree';
import parserTypescript from 'prettier/plugins/typescript';
import prettier from 'prettier/standalone';

export function getFileFromContent(filePath: string, content: string | Uint8Array) {
    const type = content instanceof Uint8Array ? 'binary' : 'text';
    const newFile: SandboxFile =
        type === 'binary'
            ? {
                  type,
                  path: filePath,
                  content: content as Uint8Array,
              }
            : {
                  type,
                  path: filePath,
                  content: content as string,
              };
    return newFile;
}

export function isJsxFile(filePath: string): boolean {
    const extension = path.extname(filePath);
    if (!extension || !NEXT_JS_FILE_EXTENSIONS.includes(extension)) {
        return false;
    }
    return true;
}

export async function writeFile(
    client: WebSocketSession,
    path: string,
    content: string | Uint8Array,
    overwrite: boolean = false,
) {
    const normalizedPath = normalizePath(path);
    let writeContent = content;

    // If the file is a JSX file, we need to process it for mapping before writing
    if (typeof content === 'string' && isJsxFile(normalizedPath)) {
        try {
            const { newContent } = await processFileForMapping(
                normalizedPath,
                content,
                // TODO: add router type, probably a legacy thing?
                // this.routerConfig?.type,
            );
            writeContent = newContent;
        } catch (error) {
            console.error(`Error processing file ${normalizedPath}:`, error);
        }
    }

    try {
        if (typeof writeContent === 'string') {
            await client.fs.writeTextFile(normalizedPath, writeContent);
        } else if (writeContent instanceof Uint8Array) {
            await client.fs.writeFile(normalizedPath, writeContent);
        } else {
            throw new Error(`Invalid content type ${typeof writeContent}`);
        }
        return true;
    } catch (error) {
        console.error(`Error writing remote file ${normalizedPath}:`, error);
        return false;
    }
}

export async function processFileForMapping(
    filePath: string,
    content: string,
    routerType: RouterType = RouterType.APP,
): Promise<{
    modified: boolean;
    newContent: string;
}> {
    const ast = getAstFromContent(content);
    if (!ast) {
        throw new Error(`Failed to get ast for file ${filePath}`);
    }

    if (isRootLayoutFile(filePath, routerType)) {
        injectPreloadScript(ast);
    }

    const { ast: astWithIds, modified } = addOidsToAst(ast);

    // Format content then create map
    const unformattedContent = await getContentFromAst(astWithIds, content);
    const formattedContent = await formatContent(filePath, unformattedContent);
    const astWithIdsAndFormatted = getAstFromContent(formattedContent);
    const finalAst = astWithIdsAndFormatted ?? astWithIds;
    // const templateNodeMap = createTemplateNodeMap(finalAst, filePath);
    // this.updateMapping(templateNodeMap);
    const newContent = await getContentFromAst(finalAst, content);
    return {
        modified,
        newContent,
    };
}

export async function readRemoteFile(
    client: WebSocketSession,
    filePath: string,
): Promise<SandboxFile | null> {
    try {
        if (isImageFile(filePath)) {
            console.log('reading image file', filePath);

            const content = await client.fs.readFile(filePath);
            return getFileFromContent(filePath, content);
        } else {
            const content = await client.fs.readTextFile(filePath);
            return getFileFromContent(filePath, content);
        }
    } catch (error) {
        console.error(`Error reading remote file ${filePath}:`, error);
        return null;
    }
}

export async function fileExists(client: WebSocketSession, path: string): Promise<boolean> {
    const normalizedPath = normalizePath(path);

    try {
        const dirPath = getDirName(normalizedPath);
        const fileName = getBaseName(normalizedPath);
        const dirEntries = await client.fs.readdir(dirPath);
        return dirEntries.some((entry) => entry.name === fileName);
    } catch (error) {
        console.error(`Error checking file existence ${normalizedPath}:`, error);
        return false;
    }
}

export async function formatContent(filePath: string, content: string): Promise<string> {
    try {
        const extension = path.extname(filePath);
        if (!NEXT_JS_FILE_EXTENSIONS.includes(extension)) {
            console.log('Skipping formatting for non-TS/TSX file:', filePath);
            return content;
        }

        const formattedContent = await prettier.format(content, {
            filepath: filePath,
            plugins: [parserEstree, parserTypescript],
            parser: 'typescript',
        });
        return formattedContent;
    } catch (error: any) {
        console.error('Error formatting file:', error);
        return content;
    }
}
