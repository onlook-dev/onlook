import { ClientError, ClientErrorCode } from "@/provider/definition";
import { SandboxCreateInput } from "@/provider/definition/sandbox";
import { LocalHono } from "@/server";
import { JwtAuthResponses } from "@/util/auth";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxCreateInput> = z.object({
  templateId: z.string().openapi({
    description: "The ID of the template to use for the sandbox.",
    example: "00000000-0000-0000-0000-000000000000",
  }),
  metadata: z.record(z.string(), z.string()).openapi({
    description: "The metadata of the sandbox.",
  }),
});

const ResponseSchema = z.object({
  id: z.string().openapi({
    description:
      "The ID of the sandbox. This is your own ID. It can be a UUID or any unique string.",
    example: "00000000-0000-0000-0000-000000000000",
  }),
});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/create",
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
      description:
        "Create a new sandbox. If the sandbox already exists, the system will resume the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_create(app: LocalHono) {
  app.openapi(route, async (c) => {
    const body = await c.req.valid("json");
    try {
      await c.get("client").sandbox.get({});
      await c.get("client").sandbox.resume({});
    } catch (e) {
      if (
        e instanceof ClientError &&
        e.code === ClientErrorCode.SandboxNotFound
      ) {
        await c.get("client").sandbox.create(body);
      } else {
        throw e;
      }
    }
    return c.json(
      {
        id: c.get("auth").sandboxId!,
      },
      200
    );
  });
}
