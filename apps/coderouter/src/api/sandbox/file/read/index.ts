import {
  SandboxFileReadInput,
  SandboxFileReadOutput,
} from "@/provider/definition/sandbox/file";
import { JwtAuthResponses } from "@/util/auth";
import { LocalHono } from "@/server";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxFileReadInput> = z.object({
  path: z.string().openapi({
    description: "The path of the file to read.",
    example: "/path/to/file.txt",
  }),
});

const ResponseSchema: z.ZodType<SandboxFileReadOutput> = z.object({
  data: z.string(),
});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/file/read",
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
      description: "Read a file from the sandbox.",
    },
  },
  ...JwtAuthResponses,
});

export function api_sandbox_file_read(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    const result = await c.get("client").sandbox.file.read(body);
    return c.json(result, 200);
  });
}
