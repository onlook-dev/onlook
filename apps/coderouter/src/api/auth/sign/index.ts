import { LocalHono } from "@/server";
import { encodeJwtToken, verifyApiKeyFromHeader } from "@/util/auth";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

export interface AuthSignInput {
  sandboxId?: string;
  userId?: string;
}

const BodySchema: z.ZodType<AuthSignInput> = z.object({
  sandboxId: z.string().optional().openapi({
    description:
      "The ID of the sandbox. This is your own ID. It can be a UUID or any unique string. Required when using a sandbox.",
    example: "00000000-0000-0000-0000-000000000000",
  }),
  userId: z.string().optional().openapi({
    description:
      "The ID of the user. This is your own ID. It can be a UUID or any unique string.",
    example: "00000000-0000-0000-0000-000000000000",
  }),
});

const ResponseSchema = z.object({
  jwt: z.string().openapi({
    description: `The JWT token to send when interacting with the API as header "X-Auth-Jwt.".`,
  }),
});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/auth/sign",
  security: [{ apikey: [] }],
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
    401: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "The API key is invalid.",
    },
  },
});

export function api_auth_sign(app: LocalHono) {
  app.openapi(route, async (c) => {
    if (!verifyApiKeyFromHeader(c.req.header("Authorization"))) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const body = await c.req.valid("json");
    const jwt = encodeJwtToken({
      sandboxId: body.sandboxId,
      userId: body.userId,
    });
    return c.json(
      {
        jwt,
      },
      200
    );
  });
}
