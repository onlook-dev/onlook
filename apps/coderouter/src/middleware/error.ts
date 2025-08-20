import { LocalHono } from "@/server";
import { ClientError } from "@/provider/definition";
import { HTTPException } from "hono/http-exception";
import { ContentfulStatusCode } from "hono/utils/http-status";

export function setupErrorMiddleware(app: LocalHono) {
  return app.onError(async (err, c) => {
    if (err instanceof ClientError) {
      const res = c.json(
        {
          error: err.message,
        },
        err.status as ContentfulStatusCode
      );
      return res;
    }
    console.error(
      `[${c.req.method}] ${c.req.url}`,
      "Unhandled error. Please convert to ClientError.",
      err.toString()
    );
    throw new HTTPException(500, {
      message: "Internal server error",
      cause: err,
    });
  });
}
