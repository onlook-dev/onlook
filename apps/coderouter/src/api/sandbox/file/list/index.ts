import {
  SandboxFileListInput,
  SandboxFileListOutput,
} from "@/provider/definition/sandbox/file";
import { LocalHono } from "@/server";
import { JwtAuthResponses } from "@/util/auth";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxFileListInput> = z.object({
  path: z.string().openapi({
    description: "The path of the directory to list.",
    example: "/path/to/directory",
  }),
});

const ResponseSchema: z.ZodType<SandboxFileListOutput> = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      type: z.enum(["file", "directory"]),
    })
  ),
});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/file/list",
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
      description: "List files in the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_file_list(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    const result = await c.get("client").sandbox.file.list(body);
    return c.json(result, 200);
  });
}
