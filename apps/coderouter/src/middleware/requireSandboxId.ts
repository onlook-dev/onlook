import { LocalHono } from "@/server";

export function setupRequiredSandboxIdMiddleware(app: LocalHono, path: string) {
  return app.use(path, async (c, next) => {
    const auth = c.get("auth");
    if (!auth || !auth.sandboxId) {
      return c.json(
        {
          error: `"sandboxId" is not set in JWT token.`,
        },
        400
      );
    }
    await next();
  });
}
