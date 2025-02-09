import type { PageNode } from '@onlook/models';

export const validateNextJsRoute = (route: string): { valid: boolean; error?: string } => {
    if (!route) {
        return { valid: false, error: 'Page name is required' };
    }

    // Check if it's a dynamic route
    if (route.includes('[') || route.includes(']')) {
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
    const normalizedRoute = route.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

    const checkNode = (nodes: PageNode[]): boolean => {
        for (const node of nodes) {
            if (node.path === `/${normalizedRoute}`) {
                return true;
            }
            if (node.children && checkNode(node.children)) {
                return true;
            }
        }
        return false;
    };

    return checkNode(nodes);
};
