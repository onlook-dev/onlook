/**
 * Root capability management for MCP client
 */

import type { Root } from '../client/types';

/**
 * Create a file system root
 *
 * @param path Path to the root directory
 * @param name Name of the root
 * @returns Root declaration
 */
export function createFileSystemRoot(path: string, name: string): Root {
    return {
        uri: `file://${path}`,
        name,
    };
}

/**
 * Create an HTTP root
 *
 * @param url URL of the root
 * @param name Name of the root
 * @returns Root declaration
 */
export function createHttpRoot(url: string, name: string): Root {
    return {
        uri: url.startsWith('http') ? url : `https://${url}`,
        name,
    };
}

/**
 * Create a set of common roots for a project
 *
 * @param projectPath Path to the project directory
 * @param projectName Name of the project
 * @returns Array of root declarations
 */
export function createProjectRoots(projectPath: string, projectName: string): Root[] {
    return [
        createFileSystemRoot(projectPath, projectName),
        createFileSystemRoot(`${projectPath}/src`, `${projectName} Source`),
        createFileSystemRoot(`${projectPath}/test`, `${projectName} Tests`),
    ];
}
