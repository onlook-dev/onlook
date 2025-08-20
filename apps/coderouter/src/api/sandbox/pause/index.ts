import { SandboxPauseInput } from "@/provider/definition/sandbox";
import { LocalHono } from "@/server";
import { JwtAuthResponses } from "@/util/auth";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxPauseInput> = z.object({});

const ResponseSchema = z.object({
  id: z.string().openapi({
    description:
      "The ID of the sandbox. This is your own ID. It can be a UUID or any unique string.",
    example: "00000000-0000-0000-0000-000000000000",
  }),
});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/pause",
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
      description: "Pause the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_pause(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    await c.get("client").sandbox.pause(body);
    return c.json(
      {
        id: c.get("auth").sandboxId!,
      },
      200
    );
  });
}
