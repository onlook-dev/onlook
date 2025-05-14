import { Hono } from 'jsr:@hono/hono';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const app = new Hono();

Deno.serve(app.fetch);