import { ApiRoutes } from "@onlook/models/constants/api.ts";
import { Hono } from 'jsr:@hono/hono';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { aiRouteHandler } from "./ai/index.ts";

const app = new Hono();
app.post(`/api/${ApiRoutes.AI}`, async (c) => {
    console.log("api route handler");
    return aiRouteHandler(await c.req.json())
});

Deno.serve(app.fetch);