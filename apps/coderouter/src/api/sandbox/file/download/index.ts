import {
  SandboxFileDownloadInput,
  SandboxFileDownloadOutput,
} from "@/provider/definition/sandbox/file";
import { LocalHono } from "@/server";
import { JwtAuthResponses } from "@/util/auth";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxFileDownloadInput> = z.object({
  path: z.string().openapi({
    description: "The path of the file to download.",
    example: "/path/to/file.txt",
  }),
});

const ResponseSchema: z.ZodType<SandboxFileDownloadOutput> = z.object({});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/file/download",
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
      description: "Download a file from the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_file_download(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    const result = await c.get("client").sandbox.file.download(body);
    return c.json(result, 200);
  });
}
