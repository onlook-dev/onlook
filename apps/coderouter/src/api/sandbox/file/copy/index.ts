import {
  SandboxFileCopyInput,
  SandboxFileCopyOutput,
} from "@/provider/definition/sandbox/file";
import { JwtAuthResponses } from "@/util/auth";
import { LocalHono } from "@/server";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxFileCopyInput> = z.object({
  source: z.string().openapi({
    description: "The path of the source file.",
    example: "/path/to/source.txt",
  }),
  destination: z.string().openapi({
    description: "The path of the destination file.",
    example: "/path/to/destination.txt",
  }),
  overwrite: z.boolean().openapi({
    description:
      "Whether to overwrite the destination file if it already exists.",
    example: true,
  }),
  recursive: z.boolean().openapi({
    description: "Whether to copy the file recursively.",
    example: true,
  }),
});

const ResponseSchema: z.ZodType<SandboxFileCopyOutput> = z.object({});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/file/copy",
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
      description: "Copy a file to the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_file_copy(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    const result = await c.get("client").sandbox.file.copy(body);
    return c.json(result, 200);
  });
}
