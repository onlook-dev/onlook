import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { hostingRouteHandler } from "../../hosting/index.ts";

const mockClient = createClient('http://localhost:54321', 'test-key');

Deno.test("hostingRouteHandler", async (t) => {
    await t.step("successfully deploys with valid input", async () => {
        const mockFiles = {
            "index.html": {
                content: "<html><body>Hello</body></html>"
            }
        };

        const mockConfig = {
            domains: ["test.onlook.site"]
        };

        // Mock environment variable
        Deno.env.set('FREESTYLE_API_KEY', 'test-key');

        const response = await hostingRouteHandler(mockClient, {
            files: mockFiles,
            config: mockConfig
        });

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
    });

    await t.step("fails when Freestyle API key is missing", async () => {
        // Remove environment variable
        Deno.env.delete('FREESTYLE_API_KEY');

        const response = await hostingRouteHandler(mockClient, {
            files: {},
            config: {}
        });

        assertEquals(response.status, 500);
        const body = await response.json();
        assertEquals(body.success, false);
        assertEquals(body.message, 'Failed to create deployment');
    });
}); 