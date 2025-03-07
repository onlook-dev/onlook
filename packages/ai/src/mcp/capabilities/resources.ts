/**
 * Resource capability management for MCP client
 */

import type { Resource, ResourceTemplate } from '../client/types';
import { MCPClient } from '../client';
import { MCPError, MCPErrorType } from '../client/types';

/**
 * Expand a resource template with parameters
 *
 * @param template Resource template to expand
 * @param params Parameters to expand the template with
 * @returns Expanded URI
 */
export function expandResourceTemplate(
    template: ResourceTemplate,
    params: Record<string, string>,
): string {
    let uri = template.uriTemplate;

    for (const [key, value] of Object.entries(params)) {
        uri = uri.replace(`{${key}}`, value);
    }

    return uri;
}

/**
 * Read a resource with template expansion
 *
 * @param client MCP client
 * @param uriOrTemplate URI or template to read
 * @param params Parameters for template expansion
 * @returns Resource content
 */
export async function readResourceWithTemplate(
    client: MCPClient,
    uriOrTemplate: string,
    params?: Record<string, string>,
) {
    try {
        // If params are provided, treat as a template
        if (params) {
            const resources = await client.listResources();
            // The SDK types don't match our types exactly
            const resourceTemplates = Array.isArray(resources.resourceTemplates)
                ? resources.resourceTemplates
                : [];
            const template = resourceTemplates.find((t: any) => t.uriTemplate === uriOrTemplate);

            if (!template) {
                throw new MCPError(
                    `Resource template not found: ${uriOrTemplate}`,
                    MCPErrorType.RESOURCE_ERROR,
                );
            }

            const uri = expandResourceTemplate(template, params);
            return await client.readResource(uri);
        }

        // Otherwise, treat as a direct URI
        return await client.readResource(uriOrTemplate);
    } catch (error) {
        if (error instanceof MCPError) {
            throw error;
        }

        throw new MCPError(
            `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`,
            MCPErrorType.RESOURCE_ERROR,
            error,
        );
    }
}

/**
 * Find a resource by name
 *
 * @param client MCP client
 * @param name Name of the resource to find
 * @returns Resource if found, null otherwise
 */
export async function findResourceByName(
    client: MCPClient,
    name: string,
): Promise<Resource | null> {
    const resources = await client.listResources();
    return resources.resources.find((r) => r.name === name) || null;
}

/**
 * Find a resource template by name
 *
 * @param client MCP client
 * @param name Name of the resource template to find
 * @returns Resource template if found, null otherwise
 */
export async function findResourceTemplateByName(
    client: MCPClient,
    name: string,
): Promise<ResourceTemplate | null> {
    const resources = await client.listResources();
    // The SDK types don't match our types exactly
    const resourceTemplates = Array.isArray(resources.resourceTemplates)
        ? resources.resourceTemplates
        : [];
    return resourceTemplates.find((t: any) => t.name === name) || null;
}
