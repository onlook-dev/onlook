import { SandboxUrlInput } from "@/provider/definition/sandbox";
import { LocalHono } from "@/server";
import { JwtAuthResponses } from "@/util/auth";
import { createRoute, z } from "@hono/zod-openapi";
import { env } from "bun";

const BodySchema: z.ZodType<SandboxUrlInput> = z.object({});

const ResponseSchema = z.object({
  url: z.string().openapi({
    description: "The URL of the sandbox.",
    example: "",
  }),
});

const route = createRoute({
  method: "post",
  path: env.URL_PATH_PREFIX + "/api/sandbox/url",
  security: [{ jwt: [] }],
  // no parameters
  // request: {
  //   body: {
  //     content: {
  //       "application/json": {
  //         schema: BodySchema,
  //       },
  //     },
  //   },
  // },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Get a URL to access the sandbox.",
    },
    ...JwtAuthResponses,
  },
});

export function api_sandbox_url(app: LocalHono) {
  app.openapi(route, async (c) => {
    // const body = await c.req.valid("json");
    const res = await c.get("client").sandbox.url({});
    return c.json(
      {
        url: res.url,
      },
      200
    );
  });
}
