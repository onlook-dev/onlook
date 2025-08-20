import { LocalHono } from "@/server";
import { AuthJwtPayload, decodeJwtToken } from "@/util/auth";

export function setupAuthJwtMiddleware(app: LocalHono, path: string) {
  return app.use(path, async (c, next) => {
    const jwt = c.req.header("X-Auth-Jwt");
    if (!jwt) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    try {
      const payload = decodeJwtToken(jwt) as AuthJwtPayload;
      c.set("auth", payload);
    } catch (e) {
      console.error("Failed to decode JWT.", e);
      return c.json(
        { error: "Failed to decode JWT. Fetch a new JWT token." },
        401
      );
    }

    await next();
  });
}
