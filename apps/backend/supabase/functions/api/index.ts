import { ApiRoutes } from "@onlook/models/constants/api.ts";
import { Hono } from 'jsr:@hono/hono';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { aiRouteHandler } from "./ai/index.ts";
import { authenticateUser } from "./helpers/auth.ts";

const app = new Hono();

app.post(`/api/${ApiRoutes.AI}`, async (c) => {
    const auth = await authenticateUser(c);
    if (!auth.success) {
        return auth.response;
    }
    return await aiRouteHandler(await c.req.json(), auth.user);
});

Deno.serve(app.fetch);