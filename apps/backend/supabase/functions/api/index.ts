import { ApiRoutes, BASE_API_ROUTE } from "@onlook/models/constants/api.ts";
import { Hono } from 'jsr:@hono/hono';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { aiRouteHandler } from "./ai/index.ts";
import { authenticateUser } from "./helpers/auth.ts";
import { customDomainsRouteHandler } from "./hosting.ts/domains.ts";
import { hostingRouteHandler } from "./hosting.ts/index.ts";

const app = new Hono();

app.post(`${BASE_API_ROUTE}${ApiRoutes.AI}`, async (c) => {
    const auth = await authenticateUser(c);
    if (!auth.success || !auth.user) {
        return auth.response;
    }
    return await aiRouteHandler(await c.req.json());
});

app.post(`${BASE_API_ROUTE}${ApiRoutes.HOSTING}`, async (c) => {
    const auth = await authenticateUser(c);
    if (!auth.success || !auth.client) {
        return auth.response;
    }
    return await hostingRouteHandler(auth.client, await c.req.json());
});

app.get(`${BASE_API_ROUTE}${ApiRoutes.HOSTING}${ApiRoutes.CUSTOM_DOMAINS}`, async (c) => {
    const auth = await authenticateUser(c);
    if (!auth.success || !auth.client) {
        return auth.response;
    }
    return await customDomainsRouteHandler(auth.client);
});

Deno.serve(app.fetch);