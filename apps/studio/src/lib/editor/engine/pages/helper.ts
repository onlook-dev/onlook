import type { PageNode } from '@onlook/models';

export const normalizeRoute = (route: string): string => {
    return route
        .replace(/\\/g, '/') // Replace backslashes with forward slashes
        .replace(/\/+/g, '/') // Replace multiple slashes with single slash
        .replace(/^\/|\/$/g, '') // Remove leading and trailing slashes
        .toLowerCase(); // Ensure lowercase
};

export const validateNextJsRoute = (route: string): { valid: boolean; error?: string } => {
    if (!route) {
        return { valid: false, error: 'Page name is required' };
    }

    // Checks if it's a dynamic route
    const hasMatchingBrackets = /\[[^\]]*\]/.test(route);
    if (hasMatchingBrackets) {
        const dynamicRegex = /^\[([a-z0-9-]+)\]$/;
        if (!dynamicRegex.test(route)) {
            return {
                valid: false,
                error: 'Invalid dynamic route format. Example: [id] or [blog]',
            };
        }
        return { valid: true };
    }

    // For regular routes, allow lowercase letters, numbers, and hyphens
    const validCharRegex = /^[a-z0-9-]+$/;
    if (!validCharRegex.test(route)) {
        return {
            valid: false,
            error: 'Page name can only contain lowercase letters, numbers, and hyphens',
        };
    }

    return { valid: true };
};

export const doesRouteExist = (nodes: PageNode[], route: string): boolean => {
    const normalizedRoute = normalizeRoute(route);

    const checkNode = (nodes: PageNode[]): boolean => {
        for (const node of nodes) {
            if (normalizeRoute(node.path) === normalizedRoute) {
                return true;
            }
            if (
                Array.isArray(node.children) &&
                node.children.length > 0 &&
                checkNode(node.children)
            ) {
                return true;
            }
        }
        return false;
    };

    return checkNode(nodes);
};
