import {
  SandboxFileDeleteInput,
  SandboxFileDeleteOutput,
} from "@/provider/definition/sandbox/file";
import { LocalHono } from "@/server";
import { JwtAuthResponses } from "@/util/auth";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxFileDeleteInput> = z.object({
  path: z.string().openapi({
    description: "The path of the file to delete.",
    example: "/path/to/file.txt",
  }),
});

const ResponseSchema: z.ZodType<SandboxFileDeleteOutput> = z.object({});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/file/delete",
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
      description: "Delete a file from the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_file_delete(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    const result = await c.get("client").sandbox.file.delete(body);
    return c.json(result, 200);
  });
}
