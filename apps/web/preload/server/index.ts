import { serve } from "bun";
import path from "path";
import { startListeningForChanges } from "./publisher";

export const preloadScriptPath = path.resolve(import.meta.dir + "/../dist/index.js");

const server = serve({
    port: 8083,
    async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/") {
            try {
                const file = Bun.file(preloadScriptPath);
                return new Response(file, {
                    headers: {
                        "Content-Type": "application/javascript",
                        "Cache-Control": "public, max-age=31536000",
                        "Access-Control-Allow-Origin": "*",
                    },
                });
            } catch (error) {
                return new Response("Script not found", { status: 404 });
            }
        }

        return new Response("Not found", { status: 404 });
    },
});

startListeningForChanges();
console.log(`CDN server listening on http://localhost:${server.port}`);
