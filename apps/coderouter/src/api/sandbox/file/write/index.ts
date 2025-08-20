import {
  SandboxFileWriteInput,
  SandboxFileWriteOutput,
} from "@/provider/definition/sandbox/file";
import { LocalHono } from "@/server";
import { JwtAuthResponses } from "@/util/auth";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxFileWriteInput> = z.object({
  files: z.array(
    z.object({
      path: z.string().openapi({
        description: "The path of the file to write.",
        example: "/path/to/file.txt",
      }),
      data: z.string().openapi({
        description: "The content of the file to write.",
        example: "Hello, world!",
      }),
      overwrite: z.boolean().openapi({
        description: "Whether to overwrite the file if it already exists.",
        example: true,
      }),
    })
  ),
});

const ResponseSchema: z.ZodType<SandboxFileWriteOutput> = z.object({});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/file/write",
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
      description: "Write a file to the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_file_write(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    const result = await c.get("client").sandbox.file.write(body);
    return c.json(result, 200);
  });
}
