import {
  SandboxFileRenameInput,
  SandboxFileRenameOutput,
} from "@/provider/definition/sandbox/file";
import { JwtAuthResponses } from "@/util/auth";
import { LocalHono } from "@/server";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxFileRenameInput> = z.object({
  oldPath: z.string().openapi({
    description: "The path of the file to rename.",
    example: "/path/to/file.txt",
  }),
  newPath: z.string().openapi({
    description: "The new path of the file.",
    example: "/path/to/new/file.txt",
  }),
});

const ResponseSchema: z.ZodType<SandboxFileRenameOutput> = z.object({});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/file/rename",
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
      description: "Rename a file in the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_file_rename(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    const result = await c.get("client").sandbox.file.rename(body);
    return c.json(result, 200);
  });
}
