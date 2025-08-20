import {
  SandboxFileStatInput,
  SandboxFileStatOutput,
} from "@/provider/definition/sandbox/file";
import { JwtAuthResponses } from "@/util/auth";
import { LocalHono } from "@/server";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxFileStatInput> = z.object({
  path: z.string().openapi({
    description: "The path of the file to stat.",
    example: "/path/to/file.txt",
  }),
});

const ResponseSchema: z.ZodType<SandboxFileStatOutput> = z.object({
  type: z.enum(["file", "directory"]),
});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/file/stat",
  security: [{ jwt: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: BodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Get the status of a file in the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_file_stat(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    const result = await c.get("client").sandbox.file.stat(body);
    return c.json(result, 200);
  });
}
